## Why

We have a rendered mindmap canvas; to reach “最小可编辑” (PRD milestone 2), users must be able to add, rename, and delete nodes on the canvas.

## What Changes

- Add basic editing actions in the editor UI:
  - add child node under the selected node
  - rename selected node
  - delete selected node (non-root)
- Implement these actions via the existing ops protocol (`Operation[]`) so manual edits and future AI ops share the same apply path.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `mindmap-canvas`: Add minimal editing actions (add/rename/delete) and apply them via ops.

## Impact

- Frontend editor UI: toolbar/actions and selection-dependent behavior
- Domain logic: expand unit tests for ops application where needed
