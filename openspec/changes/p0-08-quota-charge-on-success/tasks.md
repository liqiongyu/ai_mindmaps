## 1. Supabase RPC

- [x] 1.1 Add `mma_check_quota` RPC migration (no increment)
- [x] 1.2 Grant execute to `authenticated` and keep compatibility

## 2. Usage Helpers

- [x] 2.1 Add `checkQuota` helper in `src/lib/usage/quota.ts`
- [x] 2.2 Keep `consumeQuota` behavior unchanged for successful charge

## 3. API Routes

- [x] 3.1 Update `/api/ai/chat` to pre-check quota and charge only on success
- [x] 3.2 Update `/api/ai/chat/export` to pre-check quota and charge only on success

## 4. Tests

- [x] 4.1 Update `/api/ai/chat` tests for success/failure/over-quota/no-charge-on-failure
- [x] 4.2 Update `/api/ai/chat/export` tests for success/failure/over-quota/no-charge-on-failure
- [x] 4.3 Add concurrency edge test (check ok but consume denied)

## 5. Verification

- [x] 5.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
