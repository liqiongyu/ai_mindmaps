## Context

The editor supports selection, undo/redo, persistence, and basic manual edits (add child, delete, node details via inspector). However, structuring a mindmap often requires adding a sibling at the same level and reordering siblings to refine the outline. The underlying ops protocol already supports `add_node` with `index` and `reorder_children`.

## Goals / Non-Goals

**Goals:**

- Add an “Add sibling” action for the currently selected (non-root) node.
- Add “Move up / Move down” actions to reorder the selected node among siblings.
- Implement these actions by generating ops and applying them through the existing `applyOperations()` pipeline so undo/redo and persistence work unchanged.
- Add unit coverage for `reorder_children` to ensure correctness.

**Non-Goals:**

- Moving nodes across parents (`move_node`) or arbitrary drag/drop interactions.
- Multi-select, bulk reorder UX, or keyboard-driven outline editing.
- Any schema/database changes.

## Decisions

- Implement actions in `MindmapEditor` as toolbar buttons with disabled states:
  - “Add sibling” disabled when no selection or selection is root.
  - “Move up/down” disabled when no selection, selection is root, or at the boundary (first/last sibling).
- Derive sibling order from `orderIndex` to build a complete `orderedChildIds[]` for `reorder_children` (required by `applyOperations`).
- Keep the current prompt-based title input for parity with existing “Add child” behavior (UI refinement can be a follow-up change).

## Risks / Trade-offs

- [Risk] Prompt-based UX is minimal and can feel clunky. → Mitigation: keep ops-based implementation stable so a future UI upgrade is purely presentational.
- [Risk] Order correctness depends on normalized `orderIndex`. → Mitigation: `applyOperations()` already normalizes after deletes/moves; add tests for `reorder_children` to prevent regressions.
