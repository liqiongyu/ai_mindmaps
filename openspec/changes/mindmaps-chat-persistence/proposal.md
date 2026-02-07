## Why

MMA’s core promise is “auditable, structured mindmap edits via ops”. Today, chat transcripts (and the AI-returned `operations[]`) live only in client memory and are lost on refresh, which breaks auditability and makes debugging/reviewing AI edits impossible.

## What Changes

- Add persistent storage for chat threads and messages in Supabase/Postgres:
  - One **global** thread per mindmap.
  - One **node-scoped** thread per mindmap + selected node.
- Persist every user/assistant message pair produced by `POST /api/ai/chat`, including `operations[]` on assistant messages plus provider/model metadata.
- Implement `GET /api/ai/chat` to load the current thread’s message history (owner-only).
- Update the mindmap chat sidebar to load and display persisted messages and to keep node-scoped transcripts isolated per node.

## Capabilities

### New Capabilities

- `chat-persistence`: Persist and retrieve chat threads/messages for mindmaps (global + node-scoped), including recording assistant `operations[]` for auditability.

### Modified Capabilities

- (none)

## Impact

- Adds a Supabase migration for `chat_threads` + `chat_messages` with RLS and indexes/uniqueness.
- Updates `src/app/api/ai/chat/route.ts` to read/write chat history.
- Updates `src/app/mindmaps/[mindmapId]/MindmapChatSidebar.tsx` to fetch and render persisted transcripts.
