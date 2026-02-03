# Project Learnings - IKF AI Skills Playground

## AI Elements Integration Issues

### Problem: Type Errors in AI Elements Components
Initial assumption was that AI Elements was an npm package with type errors. Spent time trying to fix type errors in `code-block.tsx`, `confirmation.tsx`, `schema-display.tsx`, `agent.tsx`, and `terminal.tsx`.

**Root Cause**: AI Elements uses the shadcn/ui pattern - it's a CLI that copies source files into your project, not an npm dependency. The copied component source files were generated for a different TypeScript configuration, causing strict type checking failures.

**Resolution**: Removed unused components (`terminal.tsx`, `agent.tsx`, `schema-display.tsx`) that had type issues. Only kept the core components needed for chat: `conversation`, `message`, `reasoning`, `tool`, `prompt-input`, `loader`.

**Lesson**: When using shadcn/ui-style tools, the components are vendored source code, not packages. Type errors are expected if your tsconfig differs from the generator's assumptions.

## AI SDK Streaming Protocol

### Problem: Messages Not Rendering Despite Successful API Calls
Backend was returning 200 OK, conversations were being created, but no messages appeared in the chat UI. The `useChat` hook from `@ai-sdk/react` was not displaying streamed content.

**Root Cause**: AI SDK expects a specific binary data stream format with type codes:
- `0:json_value\n` for text deltas
- `9:json_value\n` for tool calls
- `a:json_value\n` for tool results
- `d:json_value\n` for finish signal

Initial backend implementation tried to emit this format but the exact binary protocol is complex and undocumented beyond type codes.

**Resolution**: Abandoned `useChat` hook entirely. Implemented custom SSE parsing in ChatPage that:
1. Reads response stream with `response.body.getReader()`
2. Decodes chunks with `TextDecoder`
3. Parses lines with format `typeCode:jsonValue`
4. Updates React state directly for type code `0` (text deltas)
5. Ignores type code `d` (finish signal)

**Lesson**: AI SDK's `useChat` is convenient but opaque. For custom backends, manual stream parsing with direct state management is more reliable and debuggable.

## React State Management with useChat

### Problem: Initial Messages Not Loading for Existing Conversations
When clicking a conversation in the sidebar, the chat area remained empty despite successfully fetching message history from the API.

**Root Cause**: The `useChat` hook only uses the `initialMessages` prop on first mount. Changing `initialMessages` after mount doesn't trigger a re-render or state update.

**Attempted Fix**: Added `key={conversationId || 'new'}` to ChatPage to force remount when conversation changes. This would have worked with `useChat` but became moot after switching to custom implementation.

**Final Resolution**: Custom implementation loads history in `useEffect` when `conversationId` changes and directly sets message state with `setMessages()`.

**Lesson**: React hooks with internal state (like `useChat`) don't react to prop changes. Use `key` prop to force remount or manage state yourself.

## Backend Streaming with Agno

### Problem: No Streaming Output from Agent
Backend's `agent.run(message, session_id=conversation_id, stream=True)` returned a RunResponse object but wasn't actually streaming chunks.

**Root Cause**: The code wasn't iterating over the stream. Just calling `agent.run(..., stream=True)` returns an iterator, but you must loop over it to get chunks.

**Attempted Fix**: Added iteration logic:
```python
for chunk in run_response:
    if hasattr(chunk, 'content') and chunk.content:
        yield format_sse_text_delta(chunk.content)
```

**Issue**: Agno's streaming behavior wasn't producing incremental chunks as expected. The iterator completed without yielding intermediate content.

**Current State**: Backend emits the final response content as a single text delta. True token-by-token streaming from Agno requires further investigation into Agno's streaming API.

**Lesson**: `stream=True` doesn't guarantee token-level streaming. Verify the framework's actual streaming granularity.

## Backend Performance (Conversations + Chat)

### Problem: `GET /api/conversations` was very slow
The backend was doing an N+1 pattern in `ConversationDB.list_conversations()`:
- 1 query to fetch conversations
- then 2 additional Supabase queries per conversation (last message preview + exact message count)

This grows linearly with the page size (50 conversations => 101 requests).

**Resolution**: Rewrote `list_conversations()` to:
- fetch the conversation page + total count in one request (`select(..., count="exact")`)
- fetch all messages for the returned conversation IDs in a single request
- compute `preview` + `message_count` locally

Optional timing logs were added behind `IKF_TIMING_LOGS=1`.

### Problem: `POST /api/chat` was slow to start (especially for new conversations)
New conversation creation was calling Gemini just to generate a 2-3 word title before returning the streaming response.

**Resolution**:
- Conversation titles now use a fast fallback immediately, and the "smart title" generation runs best-effort in a background thread (does not block request latency).
- User-message writes no longer update `conversations.updated_at` (saves a round-trip before agent execution); we update timestamps when saving the assistant message.
- Chat streaming now uses a sync generator so Starlette runs it in a threadpool; long-running streaming no longer blocks the FastAPI event loop and starves other endpoints.

**Follow-ups**:
- Add DB indexes in Supabase: `messages(conversation_id, created_at)` and `conversations(updated_at)`.
- If message volume grows, denormalize `message_count` + `last_message_preview` onto the `conversations` table (or create a Postgres view/RPC) to avoid pulling message rows just for listing.

## CORS Configuration

### Problem: Frontend Calls to Backend Blocked by CORS
Direct fetch calls from React components to `http://127.0.0.1:8000` were blocked with CORS errors.

**Root Cause**: Backend's `cors_origins` in `config.py` only included `localhost:5001` and `localhost:3000`, not `localhost:3001` (the new frontend port).

**Resolution**: 
1. Added `localhost:3001` and `127.0.0.1:3001` to CORS origins
2. Created Next.js API routes as proxies (`/api/chat`, `/api/conversations`, `/api/conversations/[id]`) to avoid CORS entirely

**Lesson**: For local development with separate frontend/backend servers, either configure CORS properly or use API proxies. Proxies are cleaner for production deployment.

## Next.js API Routes and Request Parsing

### Problem: 422 Unprocessable Entity from Backend
Frontend proxy route was forwarding requests but backend returned validation errors.

**Root Cause**: AI SDK's `useChat` sends requests with a `messages` array, not a single `message` string. The proxy route wasn't extracting the message correctly.

**Resolution**: Enhanced `/api/chat/route.ts` to handle multiple formats:
```typescript
// Check for AI SDK format with messages array
if (body.messages && Array.isArray(body.messages)) {
    const lastMessage = body.messages[body.messages.length - 1];
    if (typeof lastMessage?.content === 'string') {
        message = lastMessage.content;
    }
}
// Fallback to direct message field
if (!message && body.message) {
    message = body.message;
}
```

**Lesson**: AI SDK's `useChat` sends a different request format than simple chat APIs. Proxy routes must normalize the format for your backend.

## Conversation State Management

### Problem: Sidebar Empty on Page Refresh
Conversations only appeared after sending a message, not on initial page load.

**Root Cause**: The `useConversation` hook's `useEffect` for fetching conversations runs on mount, but there was a timing issue or the API call was failing silently.

**Resolution**: Not fully diagnosed. After implementing custom chat component and fixing CORS, the sidebar started populating correctly. Likely related to CORS blocking the initial fetch.

**Lesson**: Silent failures in `useEffect` are hard to debug. Add console.error logging for all fetch failures.

## Project Architecture Decisions

### Frontend Stack
- Next.js 16 with Turbopack for fast dev builds
- Tailwind CSS 4 for styling
- AI Elements for chat UI components (vendored via CLI)
- Custom SSE streaming instead of AI SDK's `useChat`

### Backend Stack
- FastAPI for HTTP server
- Agno for agent orchestration
- Supabase (Postgres) for conversation + message storage
- SSE streaming with data stream format (type codes)

### API Design
- All frontend API calls go through Next.js proxy routes
- Backend emits AI SDK-compatible data stream format
- Conversations stored with auto-generated titles
- Artifacts stored per-conversation in filesystem

## Key Takeaways

1. **Verify package installation method**: shadcn/ui-style tools copy source, they're not npm packages
2. **AI SDK streaming is opaque**: Custom parsing is more debuggable for non-standard backends
3. **React hooks with state don't react to props**: Use `key` to force remount or manage state yourself
4. **CORS vs Proxies**: Proxies are cleaner for production and avoid CORS complexity
5. **Stream iteration is required**: `stream=True` returns an iterator you must loop over
6. **Request format normalization**: AI SDK sends different formats than simple APIs
7. **Silent failures are debugging hell**: Always log errors in async operations
