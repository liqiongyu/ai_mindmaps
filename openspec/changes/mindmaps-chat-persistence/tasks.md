## 1. Database (Supabase)

- [ ] 1.1 Add a Supabase migration for `chat_threads` + `chat_messages` tables, constraints, indexes, and RLS policies
- [ ] 1.2 Update `docs/supabase.md` to include the new migration apply step
- [ ] 1.3 Extend `scripts/check_supabase_schema.mjs` to check the new chat tables exist

## 2. API (`/api/ai/chat`)

- [ ] 2.1 Implement `GET /api/ai/chat` to load the current thread and message history (owner-only)
- [ ] 2.2 Update `POST /api/ai/chat` to create/find the correct thread and persist user + assistant messages (including `operations[]`, provider/model)
- [ ] 2.3 Add safe rollout behavior when chat tables are not deployed yet (table-not-found → no persistence, empty history)

## 3. UI (Mindmap Chat Sidebar)

- [ ] 3.1 Load persisted messages for the active scope (global vs node) and render them
- [ ] 3.2 Ensure node-scoped transcripts are isolated per selected node (switching nodes switches history)
- [ ] 3.3 Keep send UX solid (optimistic user message, error display, disabled state when node mode is blocked)

## 4. Tests & Verification

- [ ] 4.1 Add unit coverage for any new data mapping/helpers introduced for chat persistence
- [ ] 4.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, `pnpm -s test:e2e`
