from fastapi import APIRouter, HTTPException
from pathlib import Path
import sys
from typing import Any

from src.backend.api.models import AgentRequest, AgentResponse, AgentThinkingStep, ToolCall

router = APIRouter(prefix="/api/agents", tags=["agents"])

# Add the agents directory to the path so we can import
agents_path = Path(__file__).resolve().parent.parent.parent.parent / "agents"
sys.path.insert(0, str(agents_path))


def capture_agent_response(agent, user_message: str) -> AgentResponse:
    """
    Execute the agent and capture the response with thinking steps.
    
    For now, this is a simplified implementation. In the future, we'll
    hook into Agno's streaming/events to capture tool calls in real-time.
    """
    try:
        # Import the agent creator function
        from social_media.agent import create_agent
        
        # Get the agent's response
        # Note: We'll need to enhance this to capture thinking steps
        response = agent.run(user_message)
        
        # For now, return the basic response
        # TODO: Hook into Agno's events to capture tool calls and thinking
        return AgentResponse(
            message=response.content,
            thinking_steps=[],
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")


@router.post("/execute", response_model=AgentResponse)
async def execute_agent(request: AgentRequest) -> AgentResponse:
    """
    Execute the social media agent with the provided message.
    
    This endpoint:
    1. Loads the social media agent
    2. Executes it with the user's message
    3. Returns the agent's response along with thinking steps
    
    Future enhancements:
    - Support multiple agent types
    - Stream responses in real-time
    - Persist conversation history
    - Capture tool calls and reasoning steps
    """
    try:
        # Import and create the agent
        from social_media.agent import create_agent
        agent = create_agent()
        
        # Execute and capture response
        response = capture_agent_response(agent, request.message)
        
        # Add conversation ID if provided
        if request.conversation_id:
            response.conversation_id = request.conversation_id
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute agent: {str(e)}"
        )


@router.get("/list")
async def list_agents() -> dict[str, Any]:
    """
    List all available agents.
    
    Currently returns only the social media agent.
    Future: Dynamically discover agents from the agents/ directory.
    """
    return {
        "agents": [
            {
                "id": "social_media",
                "name": "Social Media Agent",
                "description": "Expert in social media strategy, content marketing, and hygiene audits",
                "status": "active"
            }
        ],
        "total": 1
    }
