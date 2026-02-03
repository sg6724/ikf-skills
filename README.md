# IKF AI Skills Playground

Application concept is simple. we're building a skills playground for IKF. we have skills/ and agents/ and the whole idea is that when a new skill/agent needs to be created, all that needs to be done is create those md files and push them to the filesystem. no code writing required. it's all about lowering developer overhead. 
## 🚀 Core Philosophy

**Lowering Developer Overhead**: The whole idea is that when a new skill or agent needs to be created, all that needs to be done is create the corresponding `.md` files and push them to the filesystem. The system automatically discovers and integrates them.

- **Agents**: Defined in `agents/[domain]/AGENTS.md`
- **Skills**: Modular instructions and resources in `skills/[domain]/[skill-name]`

---

## 🏗️ Project Status

The project is now in its v2 architecture, featuring a robust streaming backend and a modern React-based frontend.

### Current Features:
- **Filesystem-based Discovery**: Dynamic loading of agents and skills.
- **SSE Streaming**: Custom Server-Sent Events for real-time chat, tool calls, and thinking steps.
- **Modern UI**: Built with Next.js 15, Tailwind CSS 4, and premium chat components.
- **Persistent Memory**: Chat history and sessions stored in Supabase (Postgres).
- **Artifact Generation**: Agents can generate documents (DOCX, PDF, etc.) accessible via the UI.

---

## 🛠️ Getting Started

### Prerequisites
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [Node.js](https://nodejs.org/) & `npm`

### Environment Setup

1. **Backend Environment**:
   ```bash
   cp src/backend/.env.example src/backend/.env
   # Add your API keys (GOOGLE_API_KEY, TAVILY_API_KEY, SUPABASE_URL, etc.)
   ```

2. **Frontend Environment**:
   ```bash
   cp src/frontend-v2/.env.local.example src/frontend-v2/.env.local
   ```

---

## 🏃 Running the Application

### 1. Start the Backend
```bash
cd src/backend
uv run python -m app.main
```
> [!NOTE]
> Backend runs on http://localhost:8000. API documentation is available at `/docs`.

### 2. Start the Frontend
```bash
cd src/frontend-v2
npm run dev
```
> [!NOTE]
> Frontend runs on http://localhost:3001 (or as configured in Next.js).

---

## 📂 Project Structure

- `agents/`: Domain-specific agent definitions.
- `skills/`: Modular skill instructions and toolsets.
- `src/backend/`: FastAPI application, Agno orchestration, and DB logic.
- `src/frontend-v2/`: Next.js frontend with Tailwind CSS 4.
- `local/`: Project learnings and implementation details.

---

## 🧪 Tech Stack

- **Backend**: Python 3.12, FastAPI, Agno, Supabase (PostgreSQL).
- **Frontend**: Next.js 15, Tailwind CSS 4, shadcn/ui.
- **AI Models**: Google Gemini 3 Flash
- **Tools**: Tavily (Search), Custom Filesystem Tools.
