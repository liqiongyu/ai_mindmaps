## 1. Database

- [x] 1.1 Add `mindmap_ui_state` table + RLS migration

## 2. API

- [x] 2.1 Include UI state in `GET /api/mindmaps/:id`
- [x] 2.2 Add `POST /api/mindmaps/:id/ui` upsert endpoint

## 3. Frontend (persisted mindmaps)

- [x] 3.1 Restore collapsed/selected/viewport from API response
- [x] 3.2 Debounce-save UI state changes to backend

## 4. Frontend (try mode)

- [x] 4.1 Extend try draft schema to store viewport (backward compatible)
- [x] 4.2 Persist + restore viewport in try mode

## 5. Canvas viewport plumbing

- [x] 5.1 Extend `MindmapCanvas` with `defaultViewport` + viewport change callbacks

## 6. Verification

- [x] 6.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
