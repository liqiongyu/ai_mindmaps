## Why

Mindmaps get hard to navigate as they grow. Users need a way to temporarily hide a node’s subtree to focus on a different part of the structure. The PRD also requires exports to reflect the current folded/unfolded view.

## What Changes

- Add a minimal collapse/expand interaction in the editor:
  - Collapsing a node hides its descendants from the canvas
  - Expanding shows the descendants again
- Collapse state is UI-only (in-memory) for MVP, but it MUST affect rendering and export output.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `mindmap-canvas`: Support collapsing/expanding a node subtree in the editor view.

## Impact

- UI: editor toolbar / state in `src/app/mindmaps/[mindmapId]/MindmapEditor.tsx`
- Canvas rendering: filter nodes/edges in `src/lib/mindmap/flow.ts` and `src/app/mindmaps/[mindmapId]/MindmapCanvas.tsx`
- Tests: add unit coverage for collapsed rendering behavior
