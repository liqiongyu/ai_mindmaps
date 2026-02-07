## 1. Editor UI

- [x] 1.1 Add an editor toolbar with Add child / Rename / Delete actions
- [x] 1.2 Lift `selectedNodeId` to the editor shell and wire canvas selection to it

## 2. Ops Integration

- [x] 2.1 Implement add/rename/delete by generating `Operation[]` and calling `applyOperations()`
- [x] 2.2 Add unit tests for basic ops (rename/delete) if coverage is missing

## 3. Verification

- [x] 3.1 Verify `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, and `pnpm -s build` pass
