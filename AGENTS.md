# Repository Guidelines

## Project Structure & Module Organization
- `agents/`: domain-level agent profiles (`AGENTS.md`) that define behavior/workflows.
- `skills/`: skill packages (`SKILL.md`, references, scripts) loaded dynamically by tools.
- `src/backend/`: FastAPI app, agent harness, SSE chat routes, SQLite conversation store, artifact serving.
- `src/frontend-v2/`: Next.js UI and same-origin API proxy routes (`src/app/api/...`).
- `artifacts/`: generated files grouped by conversation ID.
- `CHANGELOGS.md` and `LEARNINGS.md`: branch deltas and durable engineering patterns.

## Build, Test, and Development Commands
- Backend dev server:
```bash
cd src/backend && uv run python -m app.main
```
- Frontend dev server:
```bash
cd src/frontend-v2 && npm run dev
```
- Frontend build/lint:
```bash
cd src/frontend-v2 && npm run build
cd src/frontend-v2 && npm run lint
```
- Backend syntax sanity check:
```bash
PYTHONPYCACHEPREFIX=/tmp/pycache python3 -m py_compile src/backend/app/api/routes/chat.py
```

## Coding Style & Naming Conventions
- Python: 4-space indentation, type hints, `snake_case` functions, `PascalCase` classes.
- TS/React: functional components, `PascalCase` exports, kebab-case file names in `components/`.
- Keep changes boundary-safe:
- Browser calls use same-origin `/api/...` routes.
- Backend file-path reads must be canonicalized and root-bounded.
- Keep logic explicit and composable; avoid hidden side effects in route handlers.

## Testing Guidelines
- No full automated test suite is enforced yet; use targeted checks before PR:
- `npm run lint` for frontend.
- `py_compile` (or equivalent) for touched backend modules.
- Manually validate critical flows: chat streaming, tool output rendering, artifact download/preview.
- For new tests, use `test_*.py` (backend) and `*.test.ts(x)` (frontend) naming.

## Commit & Pull Request Guidelines
- Follow existing history style: concise imperative summaries, optional scope prefix.
- Prefer focused commits by concern (streaming, artifacts, security, UI).
- PRs should include:
- what changed and why
- affected paths/endpoints
- validation steps run
- screenshots/GIFs for UI changes
- security implications when touching paths, auth, or artifact/file handling.

## Security & Configuration Tips
- Never commit secrets (`.env` stays local).
- Use env-driven config (`SQLITE_DB_PATH`, API keys, delete safety flags).
- Keep destructive behavior fail-closed by default in no-auth mode.
