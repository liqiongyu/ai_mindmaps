## 1. Backend safety (no delete)

- [x] 1.1 Add prompt constraint that forbids `delete_node`
- [x] 1.2 Add server-side validation to reject outputs containing `delete_node` with a clear message

## 2. Change summary UI

- [x] 2.1 Add `summarizeOperations(operations)` helper (P0 counts)
- [x] 2.2 Render per-message change summary under assistant messages (including history)

## 3. Node highlight

- [x] 3.1 Derive highlight set from applied operations (add/rename/move)
- [x] 3.2 Apply highlight styling in canvas node renderer and auto-clear after 3–5 seconds

## 4. Tests + verification

- [x] 4.1 Unit tests for `summarizeOperations` and highlight extraction
- [x] 4.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, and `pnpm -s test` pass
