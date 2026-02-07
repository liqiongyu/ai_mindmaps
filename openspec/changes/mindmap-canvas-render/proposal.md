## Why

To build MMA’s core editor, we first need a minimal, reliable mindmap canvas renderer in the Next.js app (before persistence and AI ops).

## What Changes

- Add a mindmap editor page that renders a sample mindmap using `@xyflow/react` (React Flow).
- Implement a minimal tree → flow layout that positions nodes and draws parent/child edges.
- Support selecting a node (foundation for future editing + chat scope).

## Capabilities

### New Capabilities

- `mindmap-canvas`: Render a mindmap as an interactive canvas (pan/zoom, select nodes).

### Modified Capabilities

- (none)

## Impact

- Frontend: new editor route + client component for React Flow rendering
- Shared logic: mindmap state → React Flow graph conversion + layout utility
