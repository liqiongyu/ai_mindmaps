## 1. Chat Panel UI

- [x] 1.1 Add a global chat sidebar component to the persisted editor
- [x] 1.2 Implement message send flow (fetch `/api/ai/chat`, show loading/error)

## 2. Apply Ops

- [x] 2.1 Apply returned `operations[]` to `MindmapState` and re-render
- [x] 2.2 Keep selection valid after ops (fallback to root if selected node is deleted)

## 3. Layout

- [x] 3.1 Adjust editor/canvas layout to accommodate the sidebar cleanly

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
