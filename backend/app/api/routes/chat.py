"""
Chat API Route

Streaming chat endpoint that wraps the harness agent execution.
Provides SSE streaming with thinking steps, tool calls, content, and artifacts.
"""

import json
import asyncio
from typing import Optional, AsyncGenerator
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.db.conversations import get_db
from app.agent_factory import create_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Artifacts directory
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "artifacts"


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


def format_sse_event(event: str, data: dict) -> str:
    """Format data as SSE event"""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_agent_response(
    message: str,
    conversation_id: str,
) -> AsyncGenerator[str, None]:
    """
    Stream agent response as SSE events.
    
    Event types:
    - thinking: Agent's internal reasoning
    - tool_call: Tool being invoked
    - content: Response content chunk
    - artifact: Generated file
    - done: Completion signal with IDs
    - error: Error occurred
    """
    db = get_db()
    
    # Store user message
    user_message_id = db.add_message(
        conversation_id=conversation_id,
        role="user",
        content=message
    )
    
    # Create artifacts directory for this conversation
    conv_artifacts_dir = ARTIFACTS_DIR / conversation_id
    conv_artifacts_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Create agent instance
        agent = create_agent()
        
        # Collect response data
        full_content = ""
        thinking_steps = []
        artifacts = []
        
        # Run agent with streaming
        # Note: agno agent.run() returns a RunResponse with content
        # We'll stream the response and capture intermediate steps
        
        yield format_sse_event("thinking", {
            "step": "analyzing",
            "content": "Processing your request..."
        })
        
        # Execute agent - get the run response
        # The agent uses stream=True internally for print_response, 
        # but agent.run() gives us the structured response
        run_response = agent.run(message)
        
        # Check if there are tool calls/reasoning in the response
        if hasattr(run_response, 'messages') and run_response.messages:
            for msg in run_response.messages:
                # Check for tool_calls attribute (assistant messages with tool invocations)
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    for tool_call in msg.tool_calls:
                        # Try different ways to get tool name based on Agno's structure
                        tool_name = None
                        
                        # Try: tool_call.function.name (OpenAI-style)
                        if hasattr(tool_call, 'function') and hasattr(tool_call.function, 'name'):
                            tool_name = tool_call.function.name
                        # Try: tool_call.name (direct)
                        elif hasattr(tool_call, 'name') and tool_call.name:
                            tool_name = tool_call.name
                        # Try: tool_call['function']['name'] (dict-style)
                        elif isinstance(tool_call, dict):
                            func = tool_call.get('function', {})
                            tool_name = func.get('name') if isinstance(func, dict) else None
                        
                        if tool_name:
                            yield format_sse_event("tool_call", {
                                "name": tool_name,
                                "status": "complete"
                            })
                            thinking_steps.append({
                                "type": "tool_call",
                                "name": tool_name
                            })
                
                # Check for tool results (messages with role='tool')
                if hasattr(msg, 'role') and msg.role == 'tool':
                    tool_name = getattr(msg, 'name', None) or getattr(msg, 'tool_call_id', 'tool')
                    if tool_name:
                        thinking_steps.append({
                            "type": "tool_result",
                            "name": str(tool_name)
                        })
        
        # Get the final content
        if hasattr(run_response, 'content') and run_response.content:
            content = run_response.content
            
            # Stream content in chunks for better UX
            chunk_size = 50
            for i in range(0, len(content), chunk_size):
                chunk = content[i:i + chunk_size]
                full_content += chunk
                yield format_sse_event("content", {"delta": chunk})
                await asyncio.sleep(0.01)  # Small delay for streaming effect
        
        # Check for any generated artifacts (documents)
        # Look for files in the agent's tmp directory that were created
        agent_tmp = Path(__file__).resolve().parent.parent.parent.parent / "agents" / "harness" / "tmp"
        if agent_tmp.exists():
            for file_path in agent_tmp.glob("*"):
                if file_path.is_file() and file_path.suffix in ['.docx', '.xlsx', '.pdf', '.png', '.jpg']:
                    # Move to conversation artifacts
                    dest_path = conv_artifacts_dir / file_path.name
                    file_path.rename(dest_path)
                    
                    artifact_info = {
                        "filename": file_path.name,
                        "type": file_path.suffix[1:],  # Remove the dot
                        "url": f"/api/artifacts/{conversation_id}/{file_path.name}",
                        "size_bytes": dest_path.stat().st_size
                    }
                    artifacts.append(artifact_info)
                    yield format_sse_event("artifact", artifact_info)
        
        # Store assistant message
        assistant_message_id = db.add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=full_content,
            thinking_steps=thinking_steps if thinking_steps else None,
            artifacts=artifacts if artifacts else None
        )
        
        # Send done event
        yield format_sse_event("done", {
            "conversation_id": conversation_id,
            "message_id": assistant_message_id
        })
        
    except Exception as e:
        yield format_sse_event("error", {
            "message": str(e),
            "type": type(e).__name__
        })


@router.post("")
async def chat(request: ChatRequest):
    """
    Send a message and receive a streaming response.
    
    Returns an SSE stream with events:
    - `thinking`: Agent's internal reasoning steps
    - `tool_call`: Tools being invoked (name, status)
    - `content`: Response content chunks (delta)
    - `artifact`: Generated files (filename, url, type)
    - `done`: Completion signal with conversation_id and message_id
    - `error`: Error message if something fails
    
    If conversation_id is null, creates a new conversation.
    """
    db = get_db()
    
    # Get or create conversation
    if request.conversation_id:
        if not db.conversation_exists(request.conversation_id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation_id = request.conversation_id
    else:
        # Create new conversation with auto-generated title
        conversation_id = db.create_conversation(first_message=request.message)
    
    return StreamingResponse(
        stream_agent_response(request.message, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

