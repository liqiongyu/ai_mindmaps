## 1. Inline Editing UI (Canvas)

- [x] 1.1 Add a custom React Flow node renderer that supports inline title editing and double-click to edit
- [x] 1.2 Handle inline input behaviors (commit on blur, Esc to cancel, Enter/Tab to chain add nodes)

## 2. Editor State + Keybindings

- [x] 2.1 Add `editingNodeId` state and editor helpers to rename nodes and add child/sibling while entering edit mode
- [x] 2.2 Update global editor keybindings: F2 edit, Enter add child, Tab add sibling, Backspace/Delete delete (undoable)
- [x] 2.3 Remove `Enter` → Details behavior; keep Details accessible via toolbar only

## 3. Tests + Verification

- [x] 3.1 Add unit tests for keybinding-to-action mapping (pure helper)
- [x] 3.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, and `pnpm -s test` pass
