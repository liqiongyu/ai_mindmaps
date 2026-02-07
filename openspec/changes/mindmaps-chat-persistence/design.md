## Context

- MMA’s PRD requires AI-driven changes to be **auditable** by recording every assistant `operations[]` alongside the chat transcript.
- The app currently has global + node-scoped chat UI, but messages live only in client memory and are lost on refresh.
- Supabase/Postgres is already used for `mindmaps` and `mindmap_nodes` with RLS; schema migrations are applied manually via Supabase Dashboard SQL Editor.

## Goals / Non-Goals

**Goals:**

- Persist chat transcripts per mindmap in Supabase:
  - One global thread per mindmap
  - One node-scoped thread per mindmap + node
- Persist assistant `operations[]` (JSON) with provider/model metadata for auditability.
- Add `GET /api/ai/chat` to load thread history (owner-only).
- Keep node-scoped transcripts isolated per selected node (no cross-node mixing).
- Roll out safely: if migrations are not applied yet, the chat endpoint should still function (without persistence).

**Non-Goals:**

- Editing/deleting chat history, search, or pagination.
- Multi-user collaborative threads.
- Persisting full prompts/context payloads sent to the LLM.
- Public/share-page access to chat history.

## Decisions

- **Schema:** Add `chat_threads` and `chat_messages` tables.
  - `chat_threads(mindmap_id, scope, node_id)` with constraints:
    - `scope ∈ {"global","node"}`
    - `node_id` MUST be null for `global` and non-null for `node`
    - Uniqueness:
      - global: unique `(mindmap_id)` where `scope='global'`
      - node: unique `(mindmap_id, node_id)` where `scope='node'`
  - `chat_messages(thread_id, role, content, operations, provider, model, created_at)` with constraints:
    - `role ∈ {"user","assistant","system"}`
    - `operations` is nullable (stored for assistant messages)
- **RLS:** Owner-only read/write via `mindmaps.owner_id = auth.uid()`; no public policies for chat tables.
- **API:**
  - `POST /api/ai/chat` keeps the current response contract (`assistant_message` + validated `operations[]`) and additionally:
    - finds/creates the appropriate thread
    - inserts a user message row + assistant message row (assistant includes `operations`, provider/model)
  - `GET /api/ai/chat` accepts `(mindmapId, scope, selectedNodeId?)` and returns the thread (if any) + ordered message history.
  - **Safe rollout:** if chat tables are not deployed (e.g., `PGRST205` table-not-found), treat persistence as unavailable:
    - `POST` still returns the AI response
    - `GET` returns an empty history
- **UI:** Load messages from `GET /api/ai/chat` and display them; keep separate histories for global and per-node threads.

## Risks / Trade-offs

- [DB write fails after AI response is computed] → Mitigation: treat missing-table as non-fatal (rollout), but surface/return errors for other DB failures so we don’t silently lose audit data.
- [Thread duplication under concurrent creates] → Mitigation: enforce uniqueness at the database level and retry by re-selecting on conflict.
- [Increased DB load] → Mitigation: MVP stores only essential fields; no prompt payloads; no real-time streaming.

## Migration Plan

1. Add a Supabase migration creating `chat_threads` + `chat_messages` with RLS + indexes.
2. Update `docs/supabase.md` with the new migration apply step.
3. Deploy code changes; persistence remains disabled until the SQL is applied.
4. Verify schema via `pnpm -s supabase:check` once the migration is applied.
