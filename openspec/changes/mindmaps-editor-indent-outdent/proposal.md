## Why

The ops protocol supports `move_node`, but the editor UI does not expose any way to change a node’s parent. This makes it hard to reorganize a mindmap structure after initial creation (a common workflow for outlines).

For MVP, we can provide a simple, deterministic “outline-style” move UX: **Indent** (make the node a child of the previous sibling) and **Outdent** (move the node up one level, becoming a sibling after its current parent).

## What Changes

- Add editor actions for the selected node:
  - **Indent**: move the selected non-root node under its previous sibling (append as last child)
  - **Outdent**: move the selected node to its parent’s parent (insert immediately after its current parent)
- Implement these actions via `move_node` so the changes:
  - apply through the existing ops pipeline
  - participate in undo/redo
  - persist through the existing save pipeline
- Add/extend unit tests for `move_node` ordering/normalization behavior where useful.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `mindmap-canvas`: Add minimal parent-changing move actions (indent/outdent) in the editor UI.

## Impact

- UI: `src/app/mindmaps/[mindmapId]/MindmapEditor.tsx` toolbar + action handlers
- Domain tests: `src/lib/mindmap/ops.test.ts` (additional `move_node` coverage)
