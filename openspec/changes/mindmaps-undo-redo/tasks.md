## 1. History State

- [ ] 1.1 Add bounded past/present/future history state for mindmap edits
- [ ] 1.2 Reset history appropriately when loading a different persisted mindmap

## 2. Integrate With Edits

- [ ] 2.1 Record manual edit actions (add/rename/delete) into the history stack
- [ ] 2.2 Record AI-applied ops into the same history stack

## 3. Undo/Redo UX

- [ ] 3.1 Add Undo/Redo toolbar buttons with correct disabled states
- [ ] 3.2 Add keyboard shortcuts for undo/redo with editable-field guard

## 4. Tests & Verification

- [ ] 4.1 Add unit tests for history behavior (undo/redo correctness)
- [ ] 4.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
