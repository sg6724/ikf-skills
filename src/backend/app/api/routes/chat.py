"""
Chat API Route

We support 2 streaming protocols:

1) Legacy "data stream" (typeCode:jsonValue\\n, Content-Type: text/plain)
   - used by the older frontend custom parser.

2) AI SDK UIMessageChunk SSE (Content-Type: text/event-stream)
   - used by @ai-sdk/react's DefaultChatTransport and AI Elements examples.
   - emits chunks that match ai's `uiMessageChunkSchema` via `data: <json>\\n\\n`.
"""

import json
import uuid
from typing import Optional, Iterator
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.db.conversations import get_db
from app.agent_factory import create_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Artifacts directory
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent.parent / "artifacts"


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="User message to send to the agent")
    conversation_id: Optional[str] = Field(None, description="Conversation ID. If null, creates new conversation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Create a content strategy for my LinkedIn",
                "conversation_id": None
            }
        }


def format_ui_stream_part(type: str, value) -> str:
    """
    Format data as AI SDK UI message stream part.
    
    AI SDK uses a simple format:
    - Each part is: type_code:json_value\n
    - Type codes: 0=text, 9=tool_call, a=tool_result, etc.
    
    For SSE compatibility, we use data-stream format.
    """
    # AI SDK 6 data stream format
    type_codes = {
        "text": "0",       # Text delta
        "tool_call": "9",  # Tool call
        "tool_result": "a", # Tool result
        "error": "3",      # Error
        "finish": "d",     # Finish message
        "step_start": "f", # Step boundary
    }
    
    code = type_codes.get(type, "0")
    return f"{code}:{json.dumps(value)}\n"


def format_sse_text_delta(text: str) -> str:
    """Format text delta for SSE stream"""
    return format_ui_stream_part("text", text)


def format_sse_tool_call(tool_call_id: str, tool_name: str, args: dict, state: str = "input-available") -> str:
    """
    Format tool call for SSE stream.
    
    States:
    - input-streaming: Tool args being generated
    - input-available: Tool args complete, executing
    - output-available: Tool completed with result
    - output-error: Tool failed
    """
    return format_ui_stream_part("tool_call", {
        "toolCallId": tool_call_id,
        "toolName": tool_name,
        "args": args,
        "state": state
    })


def format_sse_tool_result(tool_call_id: str, result) -> str:
    """Format tool result for SSE stream"""
    return format_ui_stream_part("tool_result", {
        "toolCallId": tool_call_id,
        "result": result
    })


def format_sse_finish(reason: str = "stop") -> str:
    """Format finish message for SSE stream"""
    return format_ui_stream_part("finish", {
        "finishReason": reason,
        "usage": {"promptTokens": 0, "completionTokens": 0}
    })


def _extract_tool_call_id(obj) -> str:
    """
    Best-effort tool call id extraction across providers.
    We want stable ids so the frontend can correlate tool calls with results.
    """
    for attr in ("id", "tool_call_id", "toolCallId"):
        if hasattr(obj, attr):
            val = getattr(obj, attr)
            if val:
                return str(val)
    if isinstance(obj, dict):
        for key in ("id", "tool_call_id", "toolCallId"):
            val = obj.get(key)
            if val:
                return str(val)
    return str(uuid.uuid4())[:8]


def _format_sse_json(data: dict) -> str:
    """
    Format a single UIMessageChunk as SSE.

    The AI SDK client expects standard SSE where each event is encoded as:
      data: <json>\\n\\n
    """
    return f"data: {json.dumps(data)}\n\n"


def _guess_media_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".md":
        return "text/markdown"
    if suffix == ".txt":
        return "text/plain"
    if suffix == ".pdf":
        return "application/pdf"
    if suffix == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if suffix == ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if suffix in (".png",):
        return "image/png"
    if suffix in (".jpg", ".jpeg"):
        return "image/jpeg"
    if suffix in (".webp",):
        return "image/webp"
    return "application/octet-stream"


def stream_agent_response_ui(
    message: str,
    conversation_id: str,
) -> Iterator[str]:
    """
    Stream as AI SDK UIMessageChunk SSE (consumed by DefaultChatTransport / AI Elements).

    This stream carries:
    - tool lifecycle (tool-input-* / tool-output-*)
    - optional reasoning deltas (reasoning-*)
    - token deltas (text-*)
    - file parts when artifacts are created (file)
    """
    from agno.run.agent import RunEvent

    db = get_db()

    # Load existing conversation history for context
    conversation_history = db.get_conversation_history(conversation_id)

    db.add_message(
        conversation_id=conversation_id,
        role="user",
        content=message,
        update_conversation_updated_at=False,
    )

    conv_artifacts_dir = ARTIFACTS_DIR / conversation_id
    conv_artifacts_dir.mkdir(parents=True, exist_ok=True)

    # Track tmp artifacts so we can emit "file" chunks as soon as they appear.
    agent_tmp = Path(__file__).resolve().parent.parent.parent.parent / "agents" / "harness" / "tmp"
    seen_tmp_files: set[str] = set()
    if agent_tmp.exists():
        for p in agent_tmp.glob("*"):
            if p.is_file():
                seen_tmp_files.add(p.name)

    # UI chunk bookkeeping
    text_part_id = "text-1"
    reasoning_part_id = "reasoning-1"
    text_started = False
    reasoning_started = False
    full_content = ""
    artifacts: list[dict] = []
    tool_invocations_by_id: dict[str, dict] = {}

    # Some runtimes/proxies buffer small SSE payloads. A leading comment with padding
    # helps flush the stream early so tool events show up immediately in the UI.
    yield f": {' ' * 2048}\n\n"

    # Generate a unique message ID for this response
    import uuid
    message_id = str(uuid.uuid4())

    # Send start metadata early so the client can pick up the server-generated conversation id.
    yield _format_sse_json({
        "type": "start",
        "messageId": message_id,
        "messageMetadata": {"conversationId": conversation_id}
    })
    yield _format_sse_json({"type": "start-step"})

    try:
        agent = create_agent()

        # Build messages list: history + new message
        messages = conversation_history + [{"role": "user", "content": message}]

        run_stream = agent.run(
            messages,
            stream=True,
            stream_events=True,
        )

        for ev in run_stream:
            # DEBUG logging
            event_type = getattr(ev, "event", "unknown")
            print(f"DEBUG EVENT: {event_type}")
            
            # Tool lifecycle
            if getattr(ev, "event", None) == RunEvent.tool_call_started.value and getattr(ev, "tool", None):
                tool = ev.tool
                tool_call_id = tool.tool_call_id or _extract_tool_call_id(tool)
                tool_name = tool.tool_name or "tool"
                tool_args = tool.tool_args or {}

                tool_invocations_by_id[tool_call_id] = {
                    "type": "tool",
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                    "state": "input-available",
                    "input": tool_args,
                    "output": None,
                    "errorText": None,
                }

                yield _format_sse_json(
                    {
                        "type": "tool-input-start",
                        "toolCallId": tool_call_id,
                        "toolName": tool_name,
                    }
                )
                yield _format_sse_json(
                    {
                        "type": "tool-input-available",
                        "toolCallId": tool_call_id,
                        "toolName": tool_name,
                        "input": tool_args,
                    }
                )
                continue

            if getattr(ev, "event", None) == RunEvent.tool_call_completed.value and getattr(ev, "tool", None):
                tool = ev.tool
                tool_call_id = tool.tool_call_id or _extract_tool_call_id(tool)
                tool_result = tool.result

                if tool_call_id in tool_invocations_by_id:
                    tool_invocations_by_id[tool_call_id]["state"] = "output-available"
                    tool_invocations_by_id[tool_call_id]["output"] = tool_result

                yield _format_sse_json(
                    {
                        "type": "tool-output-available",
                        "toolCallId": tool_call_id,
                        "output": tool_result,
                    }
                )

                # If the tool created files in tmp/, promote them immediately and emit as "file" parts.
                if agent_tmp.exists():
                    for file_path in agent_tmp.glob("*"):
                        if not file_path.is_file():
                            continue
                        if file_path.name in seen_tmp_files:
                            continue
                        seen_tmp_files.add(file_path.name)

                        dest_path = conv_artifacts_dir / file_path.name
                        file_path.rename(dest_path)

                        artifacts.append(
                            {
                                "filename": dest_path.name,
                                "type": dest_path.suffix[1:].lower(),
                                "url": f"/api/artifacts/{conversation_id}/{dest_path.name}",
                                "size_bytes": dest_path.stat().st_size,
                            }
                        )

                        yield _format_sse_json(
                            {
                                "type": "file",
                                "url": f"/api/artifacts/{conversation_id}/{dest_path.name}",
                                "mediaType": _guess_media_type(dest_path.name),
                            }
                        )
                continue

            if getattr(ev, "event", None) == RunEvent.tool_call_error.value and getattr(ev, "tool", None):
                tool = ev.tool
                tool_call_id = tool.tool_call_id or _extract_tool_call_id(tool)
                error_text = getattr(ev, "error", None) or "Tool failed"

                if tool_call_id in tool_invocations_by_id:
                    tool_invocations_by_id[tool_call_id]["state"] = "output-error"
                    tool_invocations_by_id[tool_call_id]["errorText"] = str(error_text)
                yield _format_sse_json(
                    {
                        "type": "tool-output-error",
                        "toolCallId": tool_call_id,
                        "errorText": str(error_text),
                    }
                )
                continue

            # Reasoning (only present if the agent/model emits reasoning events)
            if getattr(ev, "event", None) == RunEvent.reasoning_content_delta.value:
                delta = getattr(ev, "reasoning_content", "") or ""
                if delta:
                    if not reasoning_started:
                        reasoning_started = True
                        yield _format_sse_json({"type": "reasoning-start", "id": reasoning_part_id})
                    yield _format_sse_json({"type": "reasoning-delta", "id": reasoning_part_id, "delta": delta})
                continue

            # Text streaming
            if getattr(ev, "event", None) == RunEvent.run_content.value:
                delta = getattr(ev, "content", None)
                if isinstance(delta, str) and delta:
                    if not text_started:
                        text_started = True
                        yield _format_sse_json({"type": "text-start", "id": text_part_id})
                    full_content += delta
                    yield _format_sse_json({"type": "text-delta", "id": text_part_id, "delta": delta})
                continue

            if getattr(ev, "event", None) == RunEvent.run_error.value:
                error_text = getattr(ev, "content", None) or "Run error"
                yield _format_sse_json({"type": "error", "errorText": str(error_text)})
                break

            if getattr(ev, "event", None) == RunEvent.run_completed.value:
                # If we never saw deltas but got final content, emit it as one delta.
                final_content = getattr(ev, "content", None)
                if not text_started and isinstance(final_content, str) and final_content:
                    text_started = True
                    yield _format_sse_json({"type": "text-start", "id": text_part_id})
                    full_content = final_content
                    yield _format_sse_json({"type": "text-delta", "id": text_part_id, "delta": final_content})
                break

        # Close reasoning/text parts
        if reasoning_started:
            yield _format_sse_json({"type": "reasoning-end", "id": reasoning_part_id})
        if text_started:
            yield _format_sse_json({"type": "text-end", "id": text_part_id})

        yield _format_sse_json({"type": "finish-step"})
        yield _format_sse_json({"type": "finish", "finishReason": "stop"})

        # Persist assistant response
        db.add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=full_content,
            artifacts=artifacts if artifacts else None,
        )

    except Exception as e:
        yield _format_sse_json({"type": "error", "errorText": f"Error: {str(e)}"})
        yield _format_sse_json({"type": "finish", "finishReason": "error"})


def stream_agent_response(
    message: str,
    conversation_id: str,
) -> Iterator[str]:
    """
    Stream agent response as AI SDK UIMessage stream parts.
    
    The frontend's useChat hook expects this format for proper
    real-time streaming of text, tool calls, and reasoning.
    """
    db = get_db()
    
    # Load existing conversation history for context
    conversation_history = db.get_conversation_history(conversation_id)
    
    # Store user message
    user_message_id = db.add_message(
        conversation_id=conversation_id,
        role="user",
        content=message,
        # Avoid an extra round-trip before we even start the agent run.
        # We'll update updated_at when we store the assistant message at the end.
        update_conversation_updated_at=False,
    )
    
    # Create artifacts directory for this conversation
    conv_artifacts_dir = ARTIFACTS_DIR / conversation_id
    conv_artifacts_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Create agent instance
        agent = create_agent()
        
        # Collect response data for database storage
        full_content = ""
        artifacts = []
        seen_tool_call_ids: set[str] = set()
        tool_name_by_id: dict[str, str] = {}
        
        # Build messages list: history + new message
        messages = conversation_history + [{"role": "user", "content": message}]
        
        # Execute agent with streaming.
        run_response = agent.run(
            messages,
            stream=True,
            stream_events=True,
        )
        
        # Iterate over the streaming response
        for chunk in run_response:
            # Handle different chunk types from Agno
            
            # Text content streaming
            if hasattr(chunk, 'content') and chunk.content:
                content_delta = chunk.content
                if isinstance(content_delta, str):
                    full_content += content_delta
                    yield format_sse_text_delta(content_delta)
            
            # Tool calls
            if hasattr(chunk, 'tool_calls') and chunk.tool_calls:
                for tool_call in chunk.tool_calls:
                    tool_call_id = _extract_tool_call_id(tool_call)
                    tool_name = None
                    tool_args = {}
                    
                    # Extract tool info based on Agno structure
                    if hasattr(tool_call, 'function'):
                        tool_name = getattr(tool_call.function, 'name', 'unknown')
                        try:
                            tool_args = json.loads(getattr(tool_call.function, 'arguments', '{}'))
                        except:
                            tool_args = {}
                    elif hasattr(tool_call, 'name'):
                        tool_name = tool_call.name
                        tool_args = getattr(tool_call, 'args', {})
                    
                    if tool_name:
                        # Emit tool call start
                        if tool_call_id not in seen_tool_call_ids:
                            seen_tool_call_ids.add(tool_call_id)
                            tool_name_by_id[tool_call_id] = tool_name
                        yield format_sse_tool_call(tool_call_id, tool_name, tool_args, "input-available")
            
            # Tool results (in Agno these come as separate messages)
            if hasattr(chunk, 'role') and chunk.role == 'tool':
                tool_name = getattr(chunk, 'name', 'tool')
                tool_result = getattr(chunk, 'content', None)
                if tool_result:
                    tool_call_id = _extract_tool_call_id(chunk)
                    if tool_call_id in tool_name_by_id:
                        tool_name = tool_name_by_id[tool_call_id]
                    yield format_sse_tool_result(tool_call_id, tool_result)
            # Avoid processing nested message arrays here: stream_events already emits tool events
            # and this path tends to duplicate / mis-correlate tool call ids.
        
        # If we got no streaming content, try to get final content
        if not full_content and hasattr(run_response, 'content'):
            final_content = run_response.content
            if final_content:
                full_content = final_content
                yield format_sse_text_delta(final_content)
        
        # Check for generated artifacts
        agent_tmp = Path(__file__).resolve().parent.parent.parent.parent / "agents" / "harness" / "tmp"
        if agent_tmp.exists():
            for file_path in agent_tmp.glob("*"):
                if file_path.is_file() and file_path.suffix in ['.docx', '.xlsx', '.pdf', '.png', '.jpg', '.md', '.txt']:
                    # Move to conversation artifacts
                    dest_path = conv_artifacts_dir / file_path.name
                    file_path.rename(dest_path)
                    
                    artifact_info = {
                        "filename": file_path.name,
                        "type": file_path.suffix[1:],
                        "url": f"/api/artifacts/{conversation_id}/{file_path.name}",
                        "size_bytes": dest_path.stat().st_size
                    }
                    artifacts.append(artifact_info)
                    
                    # Send artifact as text notification (AI SDK compatible)
                    yield format_sse_text_delta(f"\n\n📄 Created artifact: {file_path.name}")
        
        # Store assistant message
        assistant_message_id = db.add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=full_content,
            artifacts=artifacts if artifacts else None
        )
        
        # Send finish signal
        yield format_sse_finish("stop")
        
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        yield format_sse_text_delta(error_msg)
        yield format_sse_finish("error")


@router.post("")
def chat(request: ChatRequest):
    """
    Send a message and receive a streaming response.
    
    Returns an AI SDK compatible data stream with:
    - Text deltas (streamed token by token)
    - Tool calls with state transitions
    - Finish signal
    
    Compatible with @ai-sdk/react useChat hook.
    """
    db = get_db()
    
    # Get or create conversation
    if request.conversation_id:
        if not db.conversation_exists(request.conversation_id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation_id = request.conversation_id
    else:
        conversation_id = db.create_conversation(first_message=request.message)

    # Debug: log conversation id and history size
    try:
        history_count = len(db.get_conversation_history(conversation_id))
    except Exception:
        history_count = -1
    print(f"[CHAT] conversation_id={conversation_id} history_count={history_count}")
    
    return StreamingResponse(
        stream_agent_response(request.message, conversation_id),
        media_type="text/plain",  # AI SDK uses text/plain for data streams
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Vercel-AI-Data-Stream": "v1"  # AI SDK header
        }
    )


@router.post("/ui")
def chat_ui(request: ChatRequest):
    """
    Send a message and receive an AI SDK UIMessageChunk SSE stream.

    This is compatible with @ai-sdk/react DefaultChatTransport + AI Elements examples.
    """
    import sys
    
    db = get_db()

    if request.conversation_id:
        if not db.conversation_exists(request.conversation_id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation_id = request.conversation_id
    else:
        conversation_id = db.create_conversation(first_message=request.message)

    try:
        history_count = len(db.get_conversation_history(conversation_id))
    except Exception:
        history_count = -1
    print(f"[STREAM] Creating StreamingResponse for conversation {conversation_id} history_count={history_count}")

    return StreamingResponse(
        stream_agent_response_ui(request.message, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
