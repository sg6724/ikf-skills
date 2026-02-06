### Fixed

  - Path traversal in skill reference loading blocked by resolved-path + root-boundary checks.
    src/backend/agents/harness/tools/discover_skills.py
  - SSE error signaling fixed: run_error now finishes as error and does not persist assistant success message.
    src/backend/app/api/routes/chat.py
    src/frontend-v2/src/components/artifact-panel.tsx
  - Unsafe unauthenticated deletion path closed by default (guarded with config flag).
    src/backend/app/api/routes/conversations.py
    src/backend/app/config.py
    src/frontend-v2/src/components/sidebar.tsx
  - P2: artifact filename collision risk fixed with UUID suffix in filename generation.
    src/backend/agents/harness/tools/create_artifact.py
  - P2: SQLite path now uses settings.sqlite_db_path instead of hardcoded path.
    src/backend/app/db/conversations.py

### Added
  - Request-scoped runtime context for artifact directory/run/conversation IDs.
  - Central backend path constants module.
    src/backend/app/paths.py
  - Next.js artifact proxy route (/api/artifacts/[conversationId]/[filename]).
    src/frontend-v2/src/app/api/artifacts/[conversationId]/[filename]/route.ts
  - Shared chat shell component for sidebar/chat/artifact panel layout.
    src/frontend-v2/src/components/chat-layout.tsx

### Changed

    start, start-step, tool input/output/error, reasoning deltas, text deltas, file parts, finish-step,
    finish.
    src/backend/app/api/routes/chat.py
  - Tool output parsing hardened to handle JSON and Python-literal strings.
    src/backend/app/api/routes/chat.py
    src/backend/app/api/routes/chat.py
  - Artifact/document generators now use request context for per-conversation artifact routing.
    src/backend/agents/harness/tools/create_artifact.py
    src/backend/agents/harness/tools/generate_document.py
  - Frontend chat API route switched to Node http/https stream proxy (to avoid SSE buffering issues from
    fetch/undici path).
    src/frontend-v2/src/app/api/chat/route.ts
  - Frontend conversation pages simplified to ConversationProvider + ChatLayout composition.
    src/frontend-v2/src/app/page.tsx
    src/frontend-v2/src/app/c/[id]/page.tsx
  - Conversation state/routing behavior updated to preserve active streaming for first message ID assignment
    (replaceState path).
    src/frontend-v2/src/hooks/use-conversation.tsx
  - Chat rendering/UI updates for tool trace, artifact handling, and layout stability.
    src/frontend-v2/src/components/chat-page.tsx
    src/frontend-v2/src/components/ai-elements/task.tsx
    src/frontend-v2/src/components/artifact-panel.tsx
  - Skills instructions updated for doc/md/hygiene workflows.
    skills/general/docxmaker/SKILL.md
    skills/general/mdmaker/SKILL.md
    skills/social-media/hygiene-check/SKILL.md
  - DB artifact file changed.
    src/backend/data/ikf_chat.db

### Removed / Behavior removed

  - Direct frontend artifact download pattern using NEXT_PUBLIC_API_URL in browser path is removed.
  - “Always stop/success” completion semantics on backend run failures removed.
  - Open-by-default conversation deletion behavior removed (now disabled unless explicitly enabled).
  - Hardcoded SQLite DB path behavior removed.
  - No file deletions in branch diff itself (only modifications/additions).