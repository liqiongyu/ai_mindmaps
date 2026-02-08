## Problem

Users can already start editing quickly in `/try`, but after login/signup there is no guided path to import the local try draft into a cloud mindmap. This breaks the activation loop and forces users to recreate work.

## Goals (P0-01)

- After auth, detect `mma:try:draft:v1` and show a one-time decision modal (import / start blank / discard).
- Provide a backend API to import the try draft into a new persisted mindmap.
- On successful import, clear the local try draft and navigate directly to the new `/mindmaps/:id` editor.

## Non-goals

- Full analytics/metrics pipeline (covered by P0-06).
- Persisting chat history or UI state reliability guarantees (covered by P0-05).
- A full “draft manager” UI for multiple local drafts.

## Approach

1. Add `next` redirect support to `/login` and `/signup`, and pass `next=/try` from the try banner.
2. In try-mode editor, detect authenticated user + existing local draft and show the import decision modal once.
3. Implement `POST /api/mindmaps/import-try`:
   - Validate request body
   - Remap draft node IDs to fresh UUIDs
   - Create a new mindmap and persist nodes via the atomic save RPC
4. Add deterministic unit tests for ID remapping and UI-state mapping.

## Acceptance criteria

- After login/signup from `/try`, the app shows a decision modal when a try draft exists.
- “Import” creates a cloud mindmap and navigates to the persisted editor within seconds.
- Local key `mma:try:draft:v1` is cleared after import/discard/blank-start.
- The import API rejects invalid payloads and does not write partial data.
