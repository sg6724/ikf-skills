# IKF AI Skills Playground

A FastAPI + FastHTML application for executing AI agents with skills-based architecture.

## Project Structure

```
src/
├── backend/          # FastAPI backend
│   ├── main.py       # FastAPI app
│   ├── config.py     # Configuration
│   └── api/
│       ├── models.py # Pydantic models
│       └── routes/   # API endpoints
├── frontend/         # FastHTML frontend
│   ├── main.py       # FastHTML app
│   ├── components/   # UI components
│   └── static/       # CSS & assets
└── agents/           # AI agents
    └── content_marketing/

skills/
└── social-media/     # Skills organized by domain
    ├── audience-analysis/
    ├── company-research/
    ├── competitor-intel/
    ├── content-strategy/
    └── report-generation/
```

## Setup

1. **Install dependencies** (using `uv`):
```bash
uv sync
```

2. **Configure environment variables**:
```bash
cp src/agents/content_marketing/.env.example src/agents/content_marketing/.env
# Add your API keys (TAVILY_API_KEY, GOOGLE_API_KEY)
```

## Running the Application

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

## API Endpoints

### Agents
- `POST /api/agents/execute` - Execute an agent with a message
- `GET /api/agents/list` - List available agents

### Skills
- `GET /api/skills` - List all skills
- `GET /api/skills/{domain}` - List skills by domain
- `GET /api/skills/{domain}/{skill_name}` - Get skill details

### Conversations (stubs for future)
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{id}` - Get conversation

## Usage

1. Navigate to http://localhost:5001
2. Enter a message like: "Create a strategy for ikf.co.in"
3. Provide additional details when prompted
4. View the AI-generated strategy

## Design System

- **Color Palette**: Soft dual-tone pastels
  - Main background: `#F8F2FA`
  - Sidebar/Input: `#F2E5F4`
  - User messages: White
  - Agent messages: Lavender
  - Thinking steps: Soft mint green

- **Features**:
  - Rounded corners (12-20px)
  - AI-native interface
  - Markdown rendering
  - HTMX-powered interactions

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
