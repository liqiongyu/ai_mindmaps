## 1. Public viewer UI

- [x] 1.1 Add notes side panel (desktop) and bottom sheet (mobile)
- [x] 1.2 Show selected node title + breadcrumb path + notes content / empty state

## 2. Helpers + tests

- [x] 2.1 Add a pure helper to compute breadcrumb path from `MindmapState`
- [x] 2.2 Unit tests for breadcrumb helper (edge cases: missing parent, root)

## 3. Verification

- [x] 3.1 Verify `/public/:slug` remains read-only (no editor/chat)
- [x] 3.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, and `pnpm -s test` pass
