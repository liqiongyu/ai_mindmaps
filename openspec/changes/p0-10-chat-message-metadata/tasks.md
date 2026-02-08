## 1. Database

- [x] 1.1 Add `chat_messages.metadata jsonb` migration (default `{}`)
- [x] 1.2 Keep RLS/policies unchanged and backward compatible

## 2. Schemas

- [x] 2.1 Extend `AiChatPersistedMessageSchema` to include optional `metadata`
- [x] 2.2 Extend export/history route row schemas to parse optional `metadata`

## 3. API Write Path

- [x] 3.1 Persist assistant `metadata.constraints/changeSummary/deleteImpact` in `/api/ai/chat`
- [x] 3.2 Add “missing column” fallback for inserts (retry without metadata)

## 4. API Read/Export Path

- [x] 4.1 Return `metadata` in chat history (with missing-column fallback)
- [x] 4.2 Return `metadata` in audit export JSON (with missing-column fallback)

## 5. UI

- [x] 5.1 Parse `metadata.constraints` from history into `ChatMessage.constraints`

## 6. Tests

- [x] 6.1 Add/adjust chat route test: assistant insert includes metadata; failures don’t break
- [x] 6.2 Add chat history test: constraints summary survives refresh (metadata -> constraints)
- [x] 6.3 Add export test: metadata included when present; compatible when missing

## 7. Verification

- [x] 7.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
