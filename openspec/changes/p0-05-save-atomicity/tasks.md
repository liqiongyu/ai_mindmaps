## 1. Save atomicity

- [x] 1.1 Remove non-atomic fallback path in `POST /api/mindmaps/:id/save`
- [x] 1.2 Add explicit error codes for persistence-unavailable vs save-failed

## 2. Persistence contract

- [x] 2.1 Add `persistence: { chat, uiState }` to `GET /api/mindmaps/:id`
- [x] 2.2 Add `persistence: { chatPersisted }` to `POST /api/ai/chat`

## 3. UUID schema tightening

- [x] 3.1 Tighten `MindmapStateSchema` to UUID ids (`id/rootNodeId/parentId`)
- [x] 3.2 Update sample/test fixtures to UUID ids
- [x] 3.3 Add legacy try-draft parse fallback + id remap to avoid data loss

## 4. Frontend UX

- [x] 4.1 Show explicit “未完成云端持久化” messaging on save failure + retry/copy actions
- [x] 4.2 Surface chat/uiState persistence availability messaging
- [x] 4.3 After AI apply, show “已应用” vs “保存中/已保存” distinction

## 5. Verification

- [x] 5.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, and `pnpm -s build` pass
