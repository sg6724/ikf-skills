# IKF AI Skills Playground

A FastAPI + FastHTML application for executing AI agents with skills-based architecture.

Application concept is simple. we're building a skills playground for IKF. we have skills/ and agents/ and the whole idea is that when a new skill/agent needs to be created, all that needs to be done is create those md files and push them to the filesystem. no code writing required. it's all about lowering developer overhead. 

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
