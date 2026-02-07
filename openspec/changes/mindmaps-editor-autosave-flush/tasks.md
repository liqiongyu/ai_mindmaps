## 1. Editor Save Flush

- [x] 1.1 Track pending/dirty save state for persisted mindmaps
- [x] 1.2 Flush latest state on `pagehide`/unmount via `sendBeacon` (fallback `fetch keepalive`)

## 2. Verification

- [x] 2.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
