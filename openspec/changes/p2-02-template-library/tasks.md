## 1. Supabase schema + seed

- [x] 1.1 Add `mindmap_templates` table migration (RLS + read policy)
- [x] 1.2 Seed a minimal built-in template set (学习/会议/项目/复盘)

## 2. Backend API

- [x] 2.1 Add `GET /api/templates` route (auth + list response)
- [x] 2.2 Extend `POST /api/mindmaps` to accept `templateId` and create from template (remap ids + atomic RPC)
- [x] 2.3 Update request/response schemas and error codes for template creation

## 3. Frontend

- [x] 3.1 Add `/mindmaps/new` create flow page (blank / template / AI entry)
- [x] 3.2 Implement template list + create from template + navigate to editor
- [x] 3.3 Update `/mindmaps` list “新建导图” to open the new create flow

## 4. Tests

- [x] 4.1 Add API integration tests for `GET /api/templates`
- [x] 4.2 Add API integration tests for `POST /api/mindmaps` with `templateId` happy path + 404

## 5. Verification

- [x] 5.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`
- [x] 5.2 Verify `pnpm -s test` and `pnpm -s build` (best-effort)
