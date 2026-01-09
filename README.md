# IKF AI Skills Playground

A FastAPI + FastHTML application for executing AI agents with skills-based architecture.

## Setup

1. **Install dependencies** (using `uv`):
```bash
uv sync
```

2. **Configure environment variables**:
```bash
cp .env.example .env
# Add your API keys (TAVILY_API_KEY, GOOGLE_API_KEY)
```

## Running the Application

### Standalone Agent in TUI
```bash
uv run src/agents/social_media/agent.py
```

### Start the Backend (Terminal 1)
```bash
uv run uvicorn src.backend.main:app --reload --port 8000
```

Backend will be available at http://localhost:8000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Start the Frontend (Terminal 2)
```bash
uv run python src/frontend/main.py
```

Frontend will be available at http://localhost:5001

## Future Roadmap

- [ ] Authentication & user management
- [ ] Conversation persistence (Firestore)
- [ ] Skills CRUD & file upload
- [ ] Multi-agent support
- [ ] Streaming responses
- [ ] Real-time tool call visualization

## Development

Built with:
- **Backend**: FastAPI, Pydantic
- **Frontend**: FastHTML, HTMX
- **AI**: Agno framework with Google Gemini
- **Tools**: Tavily (search), Custom skills
