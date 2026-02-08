## 1. Supabase schema + RPC

- [x] 1.1 Add `mindmaps.version bigint not null default 1` migration
- [x] 1.2 Update `mma_replace_mindmap_nodes` RPC to accept `p_base_version` and return `{ ok, version }` / conflict payload
- [x] 1.3 Update grants and ensure backwards-compat errors are handled (missing RPC / signature mismatch)

## 2. Backend API

- [x] 2.1 Extend `SaveMindmapRequestSchema` to require `baseVersion`
- [x] 2.2 Update `POST /api/mindmaps/[mindmapId]/save` to pass `baseVersion` to RPC and return `409 VERSION_CONFLICT`
- [x] 2.3 Update `GET /api/mindmaps/[mindmapId]` response to include current `version`

## 3. Frontend (MindmapEditor persisted save)

- [x] 3.1 Store `persistedVersion` from load response and include `baseVersion` in autosave requests
- [x] 3.2 Handle `409 VERSION_CONFLICT`: pause autosave and show conflict modal with actions
- [x] 3.3 Implement conflict actions: Load latest / Overwrite / Save as copy

## 4. Tests

- [x] 4.1 Update existing save route integration tests for the new `baseVersion` requirement
- [x] 4.2 Add save route integration test for `409 VERSION_CONFLICT` response shape
- [x] 4.3 Add unit tests for any new pure helpers (if introduced) around version/conflict handling (N/A)

## 5. Verification

- [x] 5.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`
- [x] 5.2 Verify `pnpm -s test` and `pnpm -s test:coverage`
- [x] 5.3 Verify `pnpm -s build` (best-effort)
