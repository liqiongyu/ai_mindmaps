## 1. API

- [x] 1.1 Add export request/response schemas in `src/lib/ai/chat.ts`
- [x] 1.2 Implement `GET /api/ai/chat/export` route (auth + owner check + ordered messages)

## 2. Frontend

- [x] 2.1 Add “导出审计 JSON” action for the active thread in `MindmapChatSidebar`
- [x] 2.2 Implement browser download helper (Blob + filename) and non-blocking feedback

## 3. Tests

- [x] 3.1 Unit tests for export schemas / filename formatting (deterministic)

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
