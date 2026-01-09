"""Chat components for FastHTML frontend - ChatGPT/Manus inspired design"""
from fasthtml.common import *


def ChatMessage(content: str, role: str = "user", msg_id: str = None):
    """
    Render a chat message.
    - User: Right-aligned gray bubble (ChatGPT style)
    - Agent: Left-aligned clean text with avatar
    """
    is_user = role == "user"
    
    if is_user:
        return Div(
            Div(
                Div(content, cls="message-text"),
                cls="message-bubble user-bubble"
            ),
            cls="message user",
            id=msg_id
        )
    else:
        return Div(
            Div("✨", cls="agent-avatar"),
            Div(
                Div(
                    content,
                    cls="markdown-content",
                    **{"data-markdown": "true"}
                ),
                cls="message-body"
            ),
            cls="message agent",
            id=msg_id
        )


def ThinkingIndicator():
    """
    Manus-style thinking indicator with animated dots.
    Shows while agent is processing.
    """
    return Div(
        Div("✨", cls="agent-avatar"),
        Div(
            Div(
                Span(cls="dot"), Span(cls="dot"), Span(cls="dot"),
                cls="thinking-dots"
            ),
            P("Thinking...", cls="thinking-text"),
            cls="thinking-content"
        ),
        cls="message agent thinking-message",
        id="thinking-indicator"
    )


def ToolCallBlock(tool_name: str, tool_input: str = "", status: str = "running"):
    """
    Manus-style tool call display.
    Icons: 🔍 Search, 📝 Creating file, ▶️ Executing, 📄 Reading
    """
    icons = {
        "search": "🔍",
        "create": "📝",
        "execute": "▶️",
        "read": "📄",
        "default": "⚙️"
    }
    
    # Determine icon
    icon = icons.get("default")
    for key, val in icons.items():
        if key in tool_name.lower():
            icon = val
            break
    
    status_cls = "tool-running" if status == "running" else "tool-complete"
    
    return Div(
        Span(icon, cls="tool-icon"),
        Span(tool_name, cls="tool-name"),
        Span(tool_input, cls="tool-input") if tool_input else None,
        cls=f"tool-call-block {status_cls}"
    )


def LoadingIndicator():
    """Simple loading animation"""
    return Div(
        Span(cls="dot"), Span(cls="dot"), Span(cls="dot"),
        cls="loading-dots"
    )


def ChatInput():
    """
    Floating chat input form (Manus style).
    - Resets after submit
    - Shows user message immediately
    - Displays thinking indicator
    """
    return Div(
        Form(
            Div(
                Input(
                    type="text",
                    name="message",
                    placeholder="Ask anything...",
                    cls="chat-input",
                    required=True,
                    autofocus=True,
                    autocomplete="off",
                    id="message-input"
                ),
                Button(
                    Svg(
                        Path(d="M5 12h14M12 5l7 7-7 7", stroke="currentColor", 
                             stroke_width="2", stroke_linecap="round", stroke_linejoin="round"),
                        viewBox="0 0 24 24",
                        fill="none",
                        cls="send-icon"
                    ),
                    type="submit",
                    cls="send-btn",
                    id="send-btn"
                ),
                cls="chat-input-wrapper"
            ),
            hx_post="/send-message",
            hx_target="#messages-container",
            hx_swap="beforeend",
            # Reset form after request completes
            hx_on__after_request="this.reset(); document.getElementById('message-input').focus();",
            # Show thinking indicator before request
            hx_on__before_request="""
                // Hide welcome message
                const welcome = document.getElementById('welcome-message');
                if (welcome) welcome.style.display = 'none';
                
                // Get message and show user bubble immediately
                const msg = document.getElementById('message-input').value;
                const userMsgHtml = `<div class="message user"><div class="message-bubble user-bubble"><div class="message-text">${msg}</div></div></div>`;
                document.getElementById('messages-container').insertAdjacentHTML('beforeend', userMsgHtml);
                
                // Show thinking indicator
                const thinkingHtml = `<div class="message agent thinking-message" id="thinking-indicator">
                    <div class="agent-avatar">✨</div>
                    <div class="thinking-content">
                        <div class="thinking-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
                    </div>
                </div>`;
                document.getElementById('messages-container').insertAdjacentHTML('beforeend', thinkingHtml);
                
                // Scroll to bottom
                const container = document.getElementById('messages-container');
                container.scrollTop = container.scrollHeight;
                
                // Save to localStorage
                saveMessage(msg, 'user');
            """,
            cls="chat-form",
            id="chat-form"
        ),
        cls="chat-input-container"
    )


def MessagesArea():
    """Container for chat messages"""
    return Div(
        # Welcome message (hidden after first message)
        Div(
            H1("What can I do for you?", cls="welcome-title"),
            P("I'm an AI assistant specialized in content marketing strategy.", cls="welcome-subtitle"),
            cls="welcome-container",
            id="welcome-message"
        ),
        # Messages container
        Div(id="messages-container", cls="messages-container"),
        id="messages-area",
        cls="messages-area"
    )


def LocalStorageScript():
    """JavaScript for localStorage conversation persistence"""
    return Script("""
        // Conversation persistence
        const STORAGE_KEY = 'ai_skills_conversation';
        
        function saveMessage(content, role) {
            const conversation = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            conversation.push({ content, role, timestamp: Date.now() });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
        }
        
        function loadConversation() {
            const conversation = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            if (conversation.length === 0) return;
            
            // Hide welcome
            const welcome = document.getElementById('welcome-message');
            if (welcome) welcome.style.display = 'none';
            
            const container = document.getElementById('messages-container');
            
            conversation.forEach(msg => {
                if (msg.role === 'user') {
                    container.insertAdjacentHTML('beforeend', 
                        `<div class="message user"><div class="message-bubble user-bubble"><div class="message-text">${escapeHtml(msg.content)}</div></div></div>`
                    );
                } else {
                    container.insertAdjacentHTML('beforeend',
                        `<div class="message agent"><div class="agent-avatar">✨</div><div class="message-body"><div class="markdown-content">${msg.content}</div></div></div>`
                    );
                }
            });
            
            container.scrollTop = container.scrollHeight;
        }
        
        function clearConversation() {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Load on page ready
        document.addEventListener('DOMContentLoaded', loadConversation);
    """)


def MarkdownScript():
    """JavaScript for markdown rendering"""
    return Script("""
        // Render markdown after HTMX swap
        document.body.addEventListener('htmx:afterSwap', function(evt) {
            document.querySelectorAll('[data-markdown="true"]').forEach(el => {
                if (window.marked && !el.dataset.rendered) {
                    el.innerHTML = marked.parse(el.textContent);
                    el.dataset.rendered = 'true';
                }
            });
            
            // Remove thinking indicator
            const thinking = document.getElementById('thinking-indicator');
            if (thinking) thinking.remove();
            
            // Scroll to bottom
            const container = document.getElementById('messages-container');
            if (container) container.scrollTop = container.scrollHeight;
        });
    """)


def ChatInterface():
    """Complete chat interface"""
    return Div(
        MessagesArea(),
        ChatInput(),
        LocalStorageScript(),
        MarkdownScript(),
        cls="chat-container"
    )
