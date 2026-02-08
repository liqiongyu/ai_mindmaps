## 1. Telemetry ingestion (DB + RPC)

- [x] 1.1 Add migration: `private.telemetry_events` + indexes
- [x] 1.2 Add `SECURITY DEFINER` RPC `mma_log_events(...)` + grants
- [x] 1.3 Add aggregation RPC `mma_get_daily_funnel(p_days)` + grants

## 2. Client SDK + event wiring

- [x] 2.1 Implement `getSessionId()` + `track()` (queue + sendBeacon)
- [x] 2.2 Wire key UI events (landing/try/editor/node/ai/save/export/share)

## 3. API structured logs

- [x] 3.1 Add structured JSON logs for `/api/mindmaps/*` and `/api/ai/chat`
- [x] 3.2 Ensure error responses include stable `code` where useful

## 4. Minimal dashboard

- [x] 4.1 Add internal page to view daily funnel + key health signals

## 5. Verification

- [x] 5.1 Add fast unit tests for telemetry schemas/SDK
- [x] 5.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, and `pnpm -s build` pass
