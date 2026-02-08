## 1. Presets (DB + API)

- [x] 1.1 Add migration: `ai_constraint_presets` + RLS policies
- [x] 1.2 Add presets API routes (list/create/update/delete)

## 2. `/api/ai/chat` dry-run + confirm

- [x] 2.1 Extend request/response schema (dryRun/providedOutput/preview fields)
- [x] 2.2 Implement server behavior: dry-run (no persist) + confirm (persist without model call)
- [x] 2.3 Add high-risk metadata: change summary + delete impact nodes

## 3. UI wiring

- [x] 3.1 Add preset selector + save/update/delete UI
- [x] 3.2 Use dry-run flow; require confirm for high-risk; auto-apply for low-risk
- [x] 3.3 Persist chat after apply via confirm request (best-effort)

## 4. Verification

- [x] 4.1 Add unit tests for delete impact + schema branching
- [x] 4.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, and `pnpm -s build` pass
