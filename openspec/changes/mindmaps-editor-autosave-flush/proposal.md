## Why

The editor autosaves with a debounce timer, but navigating away immediately after an edit can cancel the pending save. This risks losing recent changes, which is especially frustrating in an outline-style workflow with frequent small edits.

## What Changes

- Add a “flush on leave” behavior for persisted mindmaps:
  - On page hide/unmount, if there is a pending/unsaved state, send a best-effort save request immediately.
- Keep the existing debounce save behavior unchanged during normal editing.
- Prefer browser mechanisms designed for unload-time delivery (e.g. `navigator.sendBeacon` / `fetch(..., { keepalive: true })`).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `mindmap-canvas`: Persisted editor flushes pending autosaves when leaving the page.

## Impact

- UI: `src/app/mindmaps/[mindmapId]/MindmapEditor.tsx` save pipeline enhancements
- No schema or API contract changes (reuse existing `/api/mindmaps/:id/save`)
