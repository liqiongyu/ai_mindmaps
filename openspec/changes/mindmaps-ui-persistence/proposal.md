## Why

We have a working in-memory editor and backend APIs, but users still cannot complete the core MVP flow: create a mindmap, edit it, refresh, and continue later.

## What Changes

- Update `/mindmaps` to show a real list of the user's mindmaps and a “New mindmap” action.
- Update the editor route to load a persisted mindmap from the API and auto-save edits back to Supabase.
- Keep a dedicated `/mindmaps/demo` route for the in-memory demo editor.

## Capabilities

### New Capabilities

- `mindmaps-ui`: Mindmap list + persisted editor UX (load/save) built on top of the mindmaps APIs.

### Modified Capabilities

- (none)

## Impact

- Modifies pages/components under `src/app/mindmaps/`.
- Depends on the Supabase schema being applied and the mindmaps API endpoints being available.
