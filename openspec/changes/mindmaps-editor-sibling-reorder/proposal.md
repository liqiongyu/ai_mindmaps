## Why

The editor currently only supports adding child nodes, editing details, and deleting nodes. For basic mindmap structuring, users also need to:

- add a sibling next to the selected node without changing levels
- quickly reorder siblings to refine the outline

These are common “non-AI” editing actions and should go through the same ops pipeline so undo/redo and persistence behave consistently.

## What Changes

- Add editor actions for the selected node:
  - **Add sibling**: inserts a new node under the selected node’s parent, placed immediately after the selected node
  - **Move up / Move down**: reorders the selected node among its siblings
- Implement actions via ops:
  - `add_node` with `index` for sibling insertion
  - `reorder_children` for sibling reordering
- Add/extend unit tests for `reorder_children` behavior.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `mindmap-canvas`: Add sibling insertion and sibling reordering actions in the editor UI.

## Impact

- UI: `src/app/mindmaps/[mindmapId]/MindmapEditor.tsx` toolbar + action handlers
- Domain tests: `src/lib/mindmap/ops.test.ts` (add coverage for `reorder_children`)
