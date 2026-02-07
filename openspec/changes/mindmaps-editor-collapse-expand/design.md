## Context

The editor currently renders all nodes in the mindmap tree. There is no concept of “folding” a subtree. We want a minimal UX to collapse/expand subtrees to make navigation easier, and exports should reflect what is currently visible.

The mindmap layout is derived from the tree (`MindmapState`) via `mindmapStateToFlow()`. We can implement collapse by excluding descendants of collapsed nodes when building the layout tree.

## Goals / Non-Goals

**Goals:**

- Provide a simple collapse/expand control (toolbar) for the selected node.
- Collapse state affects rendered nodes/edges and export output.
- Keep collapse state UI-only for MVP (no DB schema changes).

**Non-Goals:**

- Persisting collapse state across sessions.
- Per-node inline collapse toggles, animations, or advanced navigation UI.

## Decisions

- Track collapsed node ids in `MindmapEditor` as an in-memory `Set<string>`.
- Pass the collapsed set down to `MindmapCanvas` and into `mindmapStateToFlow()` as an optional filter.
- Implement filtering by short-circuiting `buildTree()` when a node is collapsed (do not include children).
- Reset collapse state when loading a different mindmap; prune collapsed ids that no longer exist after edits.

## Risks / Trade-offs

- [Risk] Toolbar is getting crowded. → Mitigation: MVP acceptable; follow-up can consolidate into a menu.
- [Risk] Non-persisted collapse state may surprise users after refresh. → Mitigation: align with MVP scope; persistence can be a later change.
