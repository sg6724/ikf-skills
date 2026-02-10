"""
Chat API Route.

This endpoint exposes a single AI SDK UIMessageChunk SSE stream protocol.
"""

import json
import uuid
import ast
from contextvars import copy_context
from pathlib import Path
from typing import Any, Iterator, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agent_factory import create_agent
from app.db.conversations import get_db
from app.paths import ARTIFACTS_DIR
# IMPORTANT: Import the same ContextVar instances as the harness tools.
#
# The harness tools import these from the top-level `runtime_context` module
# (because the harness directory is added to sys.path by app.agent_factory).
# If we import them via a different module path (e.g. `agents.harness.runtime_context`),
# we end up with a second copy of the module and ContextVars, and tools will fall back
# to writing into their TMP_DIR (causing 404 on /api/artifacts/... downloads).
from runtime_context import current_artifact_dir, current_artifact_run_id, current_conversation_id

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    message: str = Field(..., description="User message to send to the agent")
    conversation_id: Optional[str] = Field(
        None,
        description="Conversation ID. If null, creates new conversation",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Create a content strategy for my LinkedIn",
                "conversation_id": None,
            }
        }


def _extract_tool_call_id(obj: Any) -> str:
    """Best-effort tool call id extraction across providers."""
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


def _format_sse_json(data: dict[str, Any]) -> str:
    """Format one UIMessageChunk as SSE."""
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
    if suffix == ".png":
        return "image/png"
    if suffix in (".jpg", ".jpeg"):
        return "image/jpeg"
    if suffix == ".webp":
        return "image/webp"
    return "application/octet-stream"


def _normalize_artifact(
    artifact: Any,
    conversation_id: str,
    conv_artifacts_dir: Path,
) -> Optional[dict[str, Any]]:
    if not isinstance(artifact, dict):
        return None

    filename = artifact.get("filename")
    url = artifact.get("url")
    if not filename and isinstance(url, str):
        filename = Path(url).name
    if not filename:
        return None

    filename = str(filename)
    if not url:
        url = f"/api/artifacts/{conversation_id}/{filename}"

    media_type = artifact.get("mediaType") or _guess_media_type(filename)
    artifact_type = artifact.get("type") or Path(filename).suffix.lstrip(".").lower()
    size_bytes = artifact.get("size_bytes")
    if size_bytes is None:
        file_path = conv_artifacts_dir / filename
        if file_path.exists():
            size_bytes = file_path.stat().st_size

    return {
        "filename": filename,
        "type": artifact_type,
        "url": url,
        "size_bytes": size_bytes,
        "mediaType": media_type,
    }


def _extract_artifacts_from_tool_result(
    tool_result: Any,
    conversation_id: str,
    conv_artifacts_dir: Path,
) -> list[dict[str, Any]]:
    parsed = _coerce_tool_result(tool_result)
    if isinstance(parsed, str):
        return []

    candidates: list[Any] = []
    if isinstance(parsed, dict):
        if isinstance(parsed.get("artifact"), dict):
            candidates.append(parsed["artifact"])
        if isinstance(parsed.get("artifacts"), list):
            candidates.extend(parsed["artifacts"])
        if not candidates and ("filename" in parsed or "url" in parsed):
            candidates.append(parsed)

    artifacts: list[dict[str, Any]] = []
    for candidate in candidates:
        normalized = _normalize_artifact(candidate, conversation_id, conv_artifacts_dir)
        if normalized:
            artifacts.append(normalized)
    return artifacts


def _coerce_tool_result(tool_result: Any) -> Any:
    """Normalize tool results that may arrive as JSON or Python-literal strings."""
    if not isinstance(tool_result, str):
        return tool_result

    try:
        return json.loads(tool_result)
    except json.JSONDecodeError:
        pass

    # Some providers/framework layers stringify Python dicts with single quotes.
    try:
        return ast.literal_eval(tool_result)
    except (SyntaxError, ValueError):
        return tool_result


def stream_agent_response(
    message: str,
    conversation_id: str,
) -> Iterator[str]:
    """Stream as AI SDK UIMessageChunk SSE."""
    db = get_db()
    conversation_history = db.get_conversation_history(conversation_id)

    db.add_message(
        conversation_id=conversation_id,
        role="user",
        content=message,
        update_conversation_updated_at=False,
    )

    conv_artifacts_dir = ARTIFACTS_DIR / conversation_id
    conv_artifacts_dir.mkdir(parents=True, exist_ok=True)

    run_context = copy_context()
    run_context.run(current_conversation_id.set, conversation_id)
    run_context.run(current_artifact_dir.set, conv_artifacts_dir)
    run_context.run(current_artifact_run_id.set, uuid.uuid4().hex[:10])

    def _stream() -> Iterator[str]:
        from agno.run.agent import RunEvent

        text_part_id = "text-1"
        reasoning_part_id = "reasoning-1"
        text_started = False
        reasoning_started = False
        run_failed = False
        full_content = ""
        artifacts: list[dict[str, Any]] = []
        emitted_artifact_urls: set[str] = set()

        yield f": {' ' * 2048}\n\n"

        message_id = str(uuid.uuid4())
        yield _format_sse_json(
            {
                "type": "start",
                "messageId": message_id,
                "messageMetadata": {"conversationId": conversation_id},
            }
        )
        yield _format_sse_json({"type": "start-step"})

        try:
            agent = create_agent()
            messages = conversation_history + [{"role": "user", "content": message}]
            run_stream = agent.run(messages, stream=True, stream_events=True)

            for ev in run_stream:
                event = getattr(ev, "event", None)

                if event == RunEvent.tool_call_started.value and getattr(ev, "tool", None):
                    tool = ev.tool
                    tool_call_id = tool.tool_call_id or _extract_tool_call_id(tool)
                    tool_name = tool.tool_name or "tool"
                    tool_args = tool.tool_args or {}

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

                if event == RunEvent.tool_call_completed.value and getattr(ev, "tool", None):
                    tool = ev.tool
                    tool_call_id = tool.tool_call_id or _extract_tool_call_id(tool)
                    tool_result = _coerce_tool_result(tool.result)

                    yield _format_sse_json(
                        {
                            "type": "tool-output-available",
                            "toolCallId": tool_call_id,
                            "output": tool_result,
                        }
                    )

                    for artifact in _extract_artifacts_from_tool_result(
                        tool_result,
                        conversation_id,
                        conv_artifacts_dir,
                    ):
                        url = artifact["url"]
                        if url in emitted_artifact_urls:
                            continue
                        emitted_artifact_urls.add(url)
                        artifacts.append(
                            {
                                "filename": artifact["filename"],
                                "type": artifact["type"],
                                "url": artifact["url"],
                                "size_bytes": artifact["size_bytes"],
                            }
                        )
                        yield _format_sse_json(
                            {
                                "type": "file",
                                "url": artifact["url"],
                                "mediaType": artifact["mediaType"],
                            }
                        )
                    continue

                if event == RunEvent.tool_call_error.value and getattr(ev, "tool", None):
                    tool = ev.tool
                    tool_call_id = tool.tool_call_id or _extract_tool_call_id(tool)
                    error_text = getattr(ev, "error", None) or "Tool failed"
                    yield _format_sse_json(
                        {
                            "type": "tool-output-error",
                            "toolCallId": tool_call_id,
                            "errorText": str(error_text),
                        }
                    )
                    continue

                if event == RunEvent.reasoning_content_delta.value:
                    delta = getattr(ev, "reasoning_content", "") or ""
                    if delta:
                        if not reasoning_started:
                            reasoning_started = True
                            yield _format_sse_json({"type": "reasoning-start", "id": reasoning_part_id})
                        yield _format_sse_json(
                            {"type": "reasoning-delta", "id": reasoning_part_id, "delta": delta}
                        )
                    continue

                if event == RunEvent.run_content.value:
                    delta = getattr(ev, "content", None)
                    if isinstance(delta, str) and delta:
                        if not text_started:
                            text_started = True
                            yield _format_sse_json({"type": "text-start", "id": text_part_id})
                        full_content += delta
                        yield _format_sse_json({"type": "text-delta", "id": text_part_id, "delta": delta})
                    continue

                if event == RunEvent.run_error.value:
                    error_text = getattr(ev, "content", None) or "Run error"
                    run_failed = True
                    yield _format_sse_json({"type": "error", "errorText": str(error_text)})
                    break

                if event == RunEvent.run_completed.value:
                    final_content = getattr(ev, "content", None)
                    if not text_started and isinstance(final_content, str) and final_content:
                        text_started = True
                        yield _format_sse_json({"type": "text-start", "id": text_part_id})
                        full_content = final_content
                        yield _format_sse_json({"type": "text-delta", "id": text_part_id, "delta": final_content})
                    break

            if reasoning_started:
                yield _format_sse_json({"type": "reasoning-end", "id": reasoning_part_id})
            if text_started:
                yield _format_sse_json({"type": "text-end", "id": text_part_id})

            yield _format_sse_json({"type": "finish-step"})
            yield _format_sse_json(
                {"type": "finish", "finishReason": "error" if run_failed else "stop"}
            )

            if not run_failed:
                db.add_message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                    artifacts=artifacts if artifacts else None,
                )
        except Exception as exc:
            yield _format_sse_json({"type": "error", "errorText": f"Error: {str(exc)}"})
            yield _format_sse_json({"type": "finish", "finishReason": "error"})

    inner = _stream()
    try:
        while True:
            yield run_context.run(next, inner)
    except StopIteration:
        return
    finally:
        run_context.run(current_artifact_run_id.set, None)
        run_context.run(current_artifact_dir.set, None)
        run_context.run(current_conversation_id.set, None)


@router.post("")
def chat(request: ChatRequest):
    """Send a message and receive an AI SDK UIMessageChunk SSE stream."""
    db = get_db()

    if request.conversation_id:
        if not db.conversation_exists(request.conversation_id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation_id = request.conversation_id
    else:
        conversation_id = db.create_conversation(first_message=request.message)

    return StreamingResponse(
        stream_agent_response(request.message, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
