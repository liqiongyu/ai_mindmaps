## Context

The persisted editor uses a debounce timer to save state to `/api/mindmaps/:id/save`. If the user navigates away immediately after an edit, the pending timer can be cleared during unmount and the save never reaches the server.

Modern browsers provide best-effort delivery mechanisms intended for unload-time events (`navigator.sendBeacon` and `fetch` with `keepalive`). We can leverage these to flush the latest state when leaving the editor.

## Goals / Non-Goals

**Goals:**

- Reduce risk of losing the last few edits by flushing pending autosaves on page hide/unmount.
- Keep existing save behavior unchanged during normal interaction (debounce, error display).
- Avoid new endpoints; reuse existing `POST /api/mindmaps/:id/save`.

**Non-Goals:**

- Guarantee delivery for very large payloads (browser limits apply); this is best-effort.
- Changing the server-side save implementation.

## Decisions

- Track whether there are pending unsaved changes with a `ref` that:
  - becomes `true` when a save is scheduled / in-flight
  - becomes `false` after a successful save
- Install a `pagehide` listener and an unmount cleanup to flush once:
  - Prefer `navigator.sendBeacon()` with an `application/json` blob
  - Fallback to `fetch(..., { keepalive: true })` if beacon is unavailable/fails
- Read the latest state from `stateRef.current` so the flush always sends the newest state.

## Risks / Trade-offs

- [Risk] Duplicate saves (in-flight + flush). → Mitigation: acceptable; save is idempotent at the state level.
- [Risk] Payload size limits for beacon/keepalive. → Mitigation: best-effort; debounce save remains primary path.
