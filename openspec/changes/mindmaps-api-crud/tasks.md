## 1. Shared Types and Validation

- [x] 1.1 Add Zod schemas for mindmap API request/response payloads
- [x] 1.2 Add helpers to convert DB rows ↔ `MindmapState`

## 2. Route Handlers

- [x] 2.1 Implement `POST /api/mindmaps` (create mindmap + root node)
- [x] 2.2 Implement `GET /api/mindmaps` (list current user's mindmaps)
- [x] 2.3 Implement `GET /api/mindmaps/:id` (load mindmap + nodes)
- [x] 2.4 Implement `POST /api/mindmaps/:id/save` (replace node set)
- [x] 2.5 Implement `POST /api/mindmaps/:id/share` (enable public + set slug)
- [x] 2.6 Implement `GET /api/public/:slug` (public load)

## 3. Tests and Verification

- [x] 3.1 Add unit tests for serialization helpers and request validation
- [x] 3.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
