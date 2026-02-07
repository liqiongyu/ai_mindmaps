## Context

- Supabase Auth is implemented and `/mindmaps` is protected server-side.
- Mindmap schema + APIs exist, but UI is still using the demo state.

## Goals / Non-Goals

**Goals:**

- Provide a usable `/mindmaps` list page for the current user.
- Make the editor route load persisted state and auto-save edits with clear status feedback.
- Preserve a demo-only editor route for local experimentation.

**Non-Goals:**

- Undo/redo UX and history stack (future milestone).
- Share UI and read-only share page UI (separate milestone).

## Decisions

- **Server protection:** keep `/mindmaps` and `/mindmaps/:id` protected via server-side redirect to `/login`.
- **Data loading:** fetch mindmap state from `GET /api/mindmaps/:id` in the client editor and initialize local state.
- **Auto-save:** debounce saves (e.g., 500ms) and show `Saving…` / `Saved` / `Error` status in the editor header.
- **Demo route:** implement `/mindmaps/demo` as a dedicated route that renders the editor in demo mode (no API calls).

## Risks / Trade-offs

- **No DB in CI:** UI changes can only be fully validated after applying the Supabase migration in the hosted project.
- **Save strategy:** save endpoint replaces all nodes; frequent autosaves may be heavier than optimal but acceptable for MVP.
