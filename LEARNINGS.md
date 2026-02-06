# Project Learnings - IKF AI Skills Playground

This file captures durable engineering lessons and guardrails.  
For chronological commit-level deltas, see `CHANGELOGS.md`.

## Current Baseline
- Backend persistence is SQLite (not Supabase/Postgres).
- Frontend talks to backend through Next.js API routes.
- Chat streaming uses AI SDK UIMessageChunk-style SSE events.
- Artifact generation and serving are part of the core product path.

## Core Lessons

### 1) Boundary-first architecture prevents production breakage
- Browser code should call same-origin `/api/...` routes only.
- Next.js route handlers proxy to backend services.
- Direct browser calls to `NEXT_PUBLIC_API_URL` create CORS and private-network issues, especially for artifact downloads.

### 2) Streaming contracts are product contracts
- SSE event shape and finish semantics must be treated as API contracts.
- `run_error` must end with `finishReason: "error"`.
- Failed runs must not be persisted as successful assistant messages.
- Minor protocol drift between backend emitter and frontend parser causes silent UI regressions.

### 3) Filesystem reads must be root-bounded
- Any user-influenced path (for skills/references/artifacts) requires:
- canonicalization with `resolve()`
- explicit root-boundary validation
- rejection of escaped paths
- This prevents local file exfiltration via `../../..` traversal.

### 4) Destructive operations should fail closed in no-auth mode
- Since user identity/ownership is not implemented yet, deletion endpoints should be conservative by default.
- Use an explicit config gate to enable unsafe behavior only when intentionally needed for local workflows.

### 5) Config must drive storage paths
- Hardcoded DB paths break containerization and environment portability.
- Resolve DB path from settings and support both:
- absolute paths
- backend-root-relative paths

### 6) Artifact naming must be collision-resistant
- Timestamp-at-second granularity is insufficient under concurrent tool calls.
- Add a unique suffix (UUID segment) to avoid overwrite/data loss.

### 7) Request-scoped runtime context avoids cross-request leakage
- Artifact directory, run ID, and conversation ID must be request-scoped.
- ContextVar-based routing prevents one run writing artifacts into another run’s context.

### 8) Frontend routing/state choices can break streaming
- Preserve in-flight stream state when first conversation IDs are assigned.
- Avoid route transitions/remounts that reset active chat stream or tool trace state mid-run.

## Security Patterns We Now Enforce
- Skill references are constrained to skill-root paths.
- Artifact URLs stay behind same-origin app routes.
- Conversation deletion is disabled by default in unauthenticated environments.
- Backend run failures are surfaced as failures end-to-end.
- Artifact filenames are unique even within same-second generation bursts.

## Reliability Patterns We Now Enforce
- Parse tool output defensively (JSON + Python-literal string fallback).
- Normalize artifact metadata before emitting to frontend.
- Preserve stream headers and disable buffering where needed in proxy routes.
- Return explicit non-OK errors in frontend API handlers and UI actions.

## Anti-Patterns To Avoid
- Do not add new direct browser -> backend calls for sensitive paths.
- Do not treat `run_error` as successful completion.
- Do not read reference/template files via unsanitized relative joins.
- Do not reintroduce hardcoded storage paths.
- Do not rely on second-level timestamps for unique file naming.

## PR Checklist For High-Risk Changes
- Chat/SSE changes:
- backend emits valid start/delta/end/finish sequence
- frontend still renders tool, reasoning, text, and file parts
- error runs surface `finishReason: error`

- Artifact changes:
- browser path remains same-origin `/api/...`
- download headers are preserved through proxy
- filenames are unique under concurrent generation

- Persistence/config changes:
- DB path honors settings in all environments
- no hardcoded local-only paths introduced

- Security-sensitive file access changes:
- path canonicalization and root checks present
- escape attempts are blocked with explicit errors

## Fast Debugging Playbook
- If messages do not render:
- inspect SSE event sequence and finish reason
- verify frontend parser still matches emitted event schema

- If artifacts fail in browser:
- check that URL is same-origin `/api/...`
- verify Next.js proxy route reaches backend and forwards headers

- If conversations disappear/reset:
- inspect route transitions and remount triggers
- verify `ConversationProvider` state is preserved where expected

- If DB writes go to wrong location:
- print resolved `sqlite_db_path` and validate absolute vs relative resolution

## Notes For Contributors
- Keep this file focused on patterns and lessons, not commit history.
- Update this doc when introducing new constraints, invariants, or failure modes.
