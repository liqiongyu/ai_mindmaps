## Why

The current editor/demo flow requires authentication, which creates a high barrier for first-time users and hurts the “30–60 seconds to value” goal. We need a no-login try mode that lets users immediately feel the editor “hand feel” and preserves work on refresh.

## What Changes

- Implement `/try` as an unauthenticated “local draft” mindmap editor:
  - Editable canvas with undo/redo and export (PNG/SVG)
  - Auto-save draft data to `localStorage` so refresh does not lose progress
  - Persist minimal UI state (collapsed nodes, selected node)
- Add a non-intrusive top banner that explains the try-mode boundary and guides users to login/signup to unlock AI + cloud features.
- Keep AI features disabled in try mode for P0 (prompt examples + clear upgrade path only).

## Capabilities

### New Capabilities

- `try-mode`: Unauthenticated try-mode editor backed by `localStorage` draft persistence.

### Modified Capabilities

- (none)

## Impact

- Frontend routing: `src/app/try/page.tsx`
- Editor UI/state: `src/app/mindmaps/[mindmapId]/MindmapEditor.tsx` (add `mode="try"` + draft persistence)
- Shared logic: new `src/lib/mindmap/tryDraft.ts` (schema + parse/serialize)
- Tests: add unit tests for draft parsing/serialization
