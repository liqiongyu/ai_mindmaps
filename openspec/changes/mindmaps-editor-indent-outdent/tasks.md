## 1. Editor Actions

- [x] 1.1 Add “Indent / Outdent” actions for selected node with correct disabled states
- [x] 1.2 Implement indent/outdent via `move_node` ops (parent change + order placement)

## 2. Tests & Verification

- [x] 2.1 Add unit coverage for `move_node` ordering/normalization behavior
- [x] 2.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
