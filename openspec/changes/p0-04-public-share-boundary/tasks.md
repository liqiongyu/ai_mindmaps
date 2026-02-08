## 1. RLS/RPC boundary

- [x] 1.1 Add migration to remove public `select` policies on `mindmaps` / `mindmap_nodes`
- [x] 1.2 Add `SECURITY DEFINER` RPC `mma_get_public_mindmap_snapshot(slug)` + grants (`anon`, `authenticated`)

## 2. Public API

- [x] 2.1 Update `GET /api/public/:slug` to use the slug-controlled RPC and return minimal fields only

## 3. Verification

- [x] 3.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, and `pnpm -s build` pass
