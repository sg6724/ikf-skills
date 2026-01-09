"""FastHTML Frontend Application - AI Skills Playground"""
from fasthtml.common import *
import httpx
from pathlib import Path
import sys

# Add project root to sys.path
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.frontend.components.sidebar import Sidebar
from src.frontend.components.chat import ChatInterface

# Backend API URL
BACKEND_URL = "http://localhost:8000"

# Create FastHTML app
app, rt = fast_app(
    live=True,
    static_path="src/frontend/static",
    hdrs=(
        Meta(charset="utf-8"),
        Meta(name="viewport", content="width=device-width, initial-scale=1.0"),
        Link(rel="stylesheet", href="/styles.css"),
        Script(src="https://unpkg.com/htmx.org@1.9.10"),
        Script(src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"),
    )
)


@rt("/")
def get():
    """Main page"""
    return Html(
        Head(
            Title("AI Skills Playground"),
            Meta(charset="utf-8"),
            Meta(name="viewport", content="width=device-width, initial-scale=1.0"),
            Link(rel="stylesheet", href="/styles.css"),
            Script(src="https://unpkg.com/htmx.org@1.9.10"),
            Script(src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"),
        ),
        Body(
            Div(
                Sidebar(),
                Main(
                    ChatInterface(),
                    cls="main-content"
                ),
                cls="app-container"
            )
        )
    )


@rt("/send-message", methods=["POST"])
async def send_message(message: str):
    """
    Handle message submission.
    
    Note: User message is already displayed via JavaScript (hx_on__before_request).
    This endpoint only returns the agent's response.
    """
    # Call backend API
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/api/agents/execute",
                json={"message": message}
            )
            response.raise_for_status()
            data = response.json()
        
        # Get agent response
        agent_content = data.get("message", "No response received.")
        
        # Return agent message only (user message already shown via JS)
        agent_msg = Div(
            Div("✨", cls="agent-avatar"),
            Div(
                Div(
                    agent_content,
                    cls="markdown-content",
                    **{"data-markdown": "true"}
                ),
                cls="message-body"
            ),
            cls="message agent"
        )
        
        # Script to save agent response to localStorage
        save_script = Script(f"""
            saveMessage({repr(agent_content)}, 'agent');
        """)
        
        return Div(agent_msg, save_script)
        
    except httpx.TimeoutException:
        return Div(
            Div("✨", cls="agent-avatar"),
            Div(
                Div("⏱️ Request timed out. The agent is taking too long to respond. Please try again.", 
                    cls="error-text"),
                cls="message-body"
            ),
            cls="message agent error"
        )
    except Exception as e:
        return Div(
            Div("✨", cls="agent-avatar"),
            Div(
                Div(f"❌ Error: {str(e)}", cls="error-text"),
                cls="message-body"
            ),
            cls="message agent error"
        )


@rt("/clear-conversation", methods=["POST"])
def clear_conversation():
    """Clear conversation and reload page"""
    return Script("clearConversation();")


if __name__ == "__main__":
    import uvicorn
    print("🎨 Starting frontend on http://localhost:5001")
    print("📡 Make sure backend is running on http://localhost:8000")
    uvicorn.run("src.frontend.main:app", host="0.0.0.0", port=5001, reload=True)
