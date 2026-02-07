## Context

The editor currently supports adding nodes, deleting nodes, editing node details, and reordering siblings. The ops protocol also supports `move_node`, but there is no UI to change a node’s parent, which is necessary for reorganizing a mindmap after initial drafting.

For MVP we’ll implement outline-style moves:

- **Indent**: make the selected node a child of its previous sibling
- **Outdent**: move the selected node up one level (to the grandparent), positioned immediately after its former parent

## Goals / Non-Goals

**Goals:**

- Provide Indent/Outdent actions in the editor UI for persisted and demo mode.
- Apply changes through `move_node` ops so undo/redo and persistence behave consistently.
- Keep behavior deterministic and layout-driven (no freeform dragging).

**Non-Goals:**

- Arbitrary “move to any parent” UX or drag-and-drop parenting.
- Cross-mindmap moves or multi-select moves.
- Database/schema changes.

## Decisions

- Implement as toolbar buttons with disabled states:
  - Indent disabled when selection is root or the first sibling.
  - Outdent disabled when selection is root or the parent is root.
- Indent implementation:
  - Find previous sibling under the same parent (by `orderIndex`).
  - Apply `move_node` with `newParentId = previousSiblingId` and append as last child (omit `index`).
- Outdent implementation:
  - Find the selected node’s parent and grandparent.
  - Apply `move_node` with `newParentId = grandparentId` and `index = parent.orderIndex + 1` to place it immediately after the former parent.

## Risks / Trade-offs

- [Risk] Toolbar may become crowded as we add more editing actions. → Mitigation: MVP acceptable; follow-up can consolidate actions into a menu.
- [Risk] Move semantics could surprise users in edge cases. → Mitigation: keep rules simple, deterministic, and add tests for ordering behavior.
