## 1. Database RPC

- [x] 1.1 Add a Supabase migration with `mma_replace_mindmap_nodes` RPC (transactional delete+insert)
- [x] 1.2 Document/validate required SQL apply steps

## 2. Save Route Update

- [x] 2.1 Update `POST /api/mindmaps/:id/save` to prefer the RPC and fall back safely
- [x] 2.2 Ensure node rows are emitted parent-before-child for FK safety

## 3. Tests & Verification

- [x] 3.1 Add unit coverage for parent-before-child row ordering
- [x] 3.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
