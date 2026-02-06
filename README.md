# IKF AI Skills Playground

Filesystem-first AI workspace for IKF. New capabilities should come from markdown-defined agents/skills whenever possible, not hardcoded logic.

## Purpose
- Reduce developer overhead for new workflows.
- Keep domain behavior in `AGENTS.md` and `SKILL.md` files.
- Maintain a stable chat + artifact platform (FastAPI backend + Next.js frontend).

## Current Architecture
- Backend: FastAPI + Agno agent runtime + SQLite conversation store.
- Frontend: Next.js app using same-origin API routes as boundary/proxy layer.
- Artifacts: generated in backend and served through API routes.
- Streaming: AI SDK UIMessageChunk-compatible SSE pipeline.

Reference change history: `CHANGELOGS.md`.

## Repository Layout
- `agents/`: domain agent profiles (`AGENTS.md`).
- `skills/`: domain skill bundles (`SKILL.md`, references, scripts).
- `src/backend/`: API, agent integration, DB, routing, artifacts.
- `src/frontend-v2/`: app UI and server-side API proxy routes.
- `artifacts/`: generated files grouped by conversation ID.

## Setup

### Prerequisites
- `uv`
- Node.js + `npm`

### Backend env (`src/backend/.env`)
Set at least:
- `GOOGLE_API_KEY`
- `TAVILY_API_KEY` (if Tavily tools are used)

Optional but important:
- `SQLITE_DB_PATH` (default: `data/ikf_chat.db`, resolved relative to `src/backend` when not absolute)
- `ALLOW_UNAUTHENTICATED_CONVERSATION_DELETE` (default: `false`)

### Frontend env (`src/frontend-v2/.env.local`)
- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`

## Run

### Backend
```bash
cd src/backend
uv run python -m app.main
```
API docs: `http://127.0.0.1:8000/docs`

### Frontend
```bash
cd src/frontend-v2
npm run dev
```

## API Surface
- `POST /api/chat` (SSE stream)
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `DELETE /api/conversations/{id}` (blocked by default unless explicitly enabled)
- `GET /api/artifacts/{conversation_id}/{filename}`
- `POST /api/export`

## Key Patterns To Follow

### 1) Filesystem-first behavior
- Prefer adding/updating `AGENTS.md` + `SKILL.md` before writing new orchestration code.
- Keep reusable templates/checklists in skill folders; load them via skill tools.

### 2) Path safety is mandatory
- Any skill reference file load must stay inside that skill’s root.
- Never join and read arbitrary relative paths without `resolve()` + root boundary checks.

### 3) Streaming contract integrity
- Backend must emit consistent UIMessageChunk SSE events.
- On run failure, emit `finishReason: "error"` and do not persist assistant success messages.
- Do not regress to “always stop/success” finish behavior.

### 4) Artifact boundary rule (strict)
- Browser code must not call backend artifact URLs directly via `NEXT_PUBLIC_API_URL`.
- Keep artifact downloads/previews behind same-origin Next.js routes:
  - client -> `/api/...` (frontend server route) -> backend API.
- Preserve response headers needed for downloads (`Content-Type`, `Content-Disposition`, etc.).

### 5) Request-scoped artifact context
- Use runtime context vars for `conversation_id`, artifact directory, and run ID.
- Tools generating artifacts must write into request-scoped output dir, not shared global temp paths.

### 6) Artifact naming and metadata
- Filenames must be collision-resistant (timestamp + unique suffix).
- Tool outputs should return normalized artifact metadata:
  - `filename`, `type`, `size_bytes`, `mediaType`, optional `url`.

### 7) Config-driven persistence
- DB path must come from settings (`sqlite_db_path`), not hardcoded constants.
- Support both absolute and backend-relative DB paths.

### 8) No-auth reality (current state)
- User auth/ownership is not implemented yet.
- Destructive operations must stay conservative/safe by default.
- If temporary unsafe behavior is needed for local workflows, gate it with explicit settings.

### 9) Frontend state/routing behavior
- Preserve active stream continuity when first conversation IDs are assigned.
- Avoid page remount patterns that break in-flight streaming/tool traces.

## Security & Reliability Guardrails
- Never commit secrets in tracked files.
- Keep conversation artifact file serving extension-restricted and traversal-safe.
- Keep SSE proxy routes unbuffered and stream-friendly.
- Validate backend errors explicitly in frontend API handlers and UI actions.

## Developer Workflow Guidance
- Prefer focused commits by concern (streaming, artifacts, security, UI).
- Keep backend/frontend boundary explicit in PR descriptions.
- When touching API contracts, update both:
  - backend emitter/response format
  - frontend consumer/parsing logic

## Quick Checks
- Backend syntax:
```bash
PYTHONPYCACHEPREFIX=/tmp/pycache python3 -m py_compile src/backend/app/api/routes/chat.py src/backend/app/db/conversations.py src/backend/agents/harness/tools/create_artifact.py
```
- Frontend lint (targeted files):
```bash
cd src/frontend-v2
npx eslint src/components/artifact-panel.tsx src/components/chat-page.tsx src/app/api/chat/route.ts
```
