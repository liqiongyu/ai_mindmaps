## 1. Database (Supabase)

- [ ] 1.1 Add migration for `plan_limits` and `usage_counters` (RLS + indexes)
- [ ] 1.2 Add RPC `mma_consume_quota` with atomic check+increment
- [ ] 1.3 Seed default `free` plan limits (AI/export/day, public_shares/active)
- [ ] 1.4 Update `scripts/check_supabase_schema.mjs` to include new tables

## 2. Backend quota guard

- [ ] 2.1 Add shared quota helper in `src/lib/usage/*` (plan key, consume, missing-schema fallback)
- [ ] 2.2 Enforce quota in `POST /api/ai/chat` before provider call
- [ ] 2.3 Enforce quota in `GET /api/ai/chat/export` for successful exports
- [ ] 2.4 Enforce active share limit in `POST /api/mindmaps/:id/share`

## 3. Usage API

- [ ] 3.1 Add `GET /api/usage` returning AI/export/share usage + limits + upgradeUrl
- [ ] 3.2 Add unit tests for `/api/usage`

## 4. Frontend usage panel + upgrade entry

- [ ] 4.1 Add usage panel to `/mindmaps` (shows used/limit + upgrade button)
- [ ] 4.2 Add `/pricing` (or equivalent) placeholder page for upgrade path
- [ ] 4.3 Update AI error handling to show upgrade action for `quota_exceeded`

## 5. Tests

- [ ] 5.1 Add/update route tests for `/api/ai/chat` over-quota path
- [ ] 5.2 Add/update route tests for `/api/ai/chat/export` over-quota path
- [ ] 5.3 Add/update route tests for `/api/mindmaps/:id/share` over-quota path

## 6. Verification

- [ ] 6.1 Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`
- [ ] 6.2 Verify UI: mindmaps list shows usage; over-quota shows clear message + upgrade link
