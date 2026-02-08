## 1. Coverage + CI

- [x] 1.1 Add Vitest coverage provider + `test:coverage` script
- [x] 1.2 Configure coverage include/exclude + per-module thresholds
- [x] 1.3 Update CI workflow to run coverage thresholds in PR checks

## 2. API Integration Tests (App Router route handlers)

- [x] 2.1 Add reusable test helpers (mock Supabase server client + request builders)
- [x] 2.2 Add integration tests for `src/app/api/mindmaps/route.ts` (list/create)
- [x] 2.3 Add integration tests for `src/app/api/mindmaps/[mindmapId]/route.ts` (load/delete)
- [x] 2.4 Add integration tests for `src/app/api/mindmaps/[mindmapId]/share/route.ts` (share start/stop)
- [x] 2.5 Add integration tests for `src/app/api/mindmaps/[mindmapId]/save/route.ts` (save success + missing RPC)
- [x] 2.6 Add integration tests for `src/app/api/ai/chat/route.ts` (validation + providedOutput path)

## 3. UI E2E (Key Journey)

- [x] 3.1 Add Playwright dependency (Chromium) for browser-driven E2E
- [x] 3.2 Add E2E test: Landing -> Try -> Edit -> Export (no external secrets)
- [x] 3.3 Add GitHub Actions workflow/job to run UI E2E on PRs

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`
- [x] 4.2 Verify `pnpm -s test` and `pnpm -s test:coverage`
- [x] 4.3 Verify `pnpm -s build` and UI E2E workflow locally (best-effort)
