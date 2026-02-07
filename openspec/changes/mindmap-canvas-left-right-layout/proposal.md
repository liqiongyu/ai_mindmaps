## Why

The PRD calls for a classic mindmap layout with a center topic and branches on both the left and right. Today the renderer lays out the full tree to the right, which makes larger maps harder to scan and does not match user expectations for a mindmap.

## What Changes

- Update the canvas layout algorithm so that:
  - The root topic is visually centered
  - Root-level branches are distributed on both the left and right sides
  - Descendants inherit their side from their root-level branch
- Keep the same underlying tree model and edge semantics; only node positioning changes.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `mindmap-canvas`: Use a left/right (two-sided) mindmap layout with a centered root.

## Impact

- Domain layout: `src/lib/mindmap/flow.ts` (positioning logic)
- Tests: add/extend unit coverage for left/right positioning invariants
