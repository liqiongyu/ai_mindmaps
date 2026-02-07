## Context

The current renderer uses a single d3 `tree()` layout and maps depth to a positive x-axis, so the entire map grows to the right. The PRD expects a classic mindmap where the root sits centrally and branches split to both sides.

We want to keep the existing data model (a rooted tree) and edge semantics, and only change node positioning.

## Goals / Non-Goals

**Goals:**

- Center the root and render branches on both left and right sides.
- Keep descendant nodes on the same side as their root-level branch.
- Preserve deterministic layout and current spacing constants.
- Continue supporting collapsed rendering filters.

**Non-Goals:**

- Persisting an explicit “side” attribute in the DB.
- Allowing the user to manually pin a branch to a specific side (future enhancement).

## Decisions

- Compute a `TreeNode` tree as today (respecting collapsed nodes).
- Split the root’s direct children into `leftChildren` and `rightChildren` deterministically:
  - Alternate children by `orderIndex` (0→right, 1→left, 2→right, …) to keep the layout balanced as users add nodes.
- Run d3 `tree()` layout separately for the left and right subtrees (each including the root), then align both layouts so the root is at the same vertical origin:
  - For each side, offset all `x` coordinates by `-root.x` so root sits at y=0.
  - Map depth (`y`) to horizontal position; mirror the left side by negating x.
- Combine nodes/edges from both sides (root included once) and shift to positive coordinates for React Flow.

## Risks / Trade-offs

- [Risk] Side assignment may not match user intent in some cases. → Mitigation: deterministic + reorderable; manual side pinning can be added later.
- [Risk] Visual changes may affect screenshots/export comparisons. → Mitigation: expected change; keep node spacing stable.
