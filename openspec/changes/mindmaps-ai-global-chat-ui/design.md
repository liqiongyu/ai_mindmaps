## Context

- `/api/ai/chat` is implemented server-side and returns validated `{ assistant_message, operations[] }`.
- The editor already supports basic manual edits and autosave persistence.

## Goals / Non-Goals

**Goals:**

- Add a global chat UI in the editor for sending prompts to the AI endpoint.
- Apply returned ops to the current in-memory `MindmapState` and let autosave persist changes.
- Provide basic UX for loading/error states and a local message transcript.

**Non-Goals:**

- Persist chat threads/messages in the database.
- Node-scoped chat UI (handled in a separate change).

## Decisions

- **Layout:** add a right sidebar panel in the editor for chat while keeping the canvas interactive.
- **State updates:** on AI success, apply ops via `applyOperations()` on the client and update selection if the selected node disappears.
- **Safety:** rely on server-side validation but also guard client-side application with try/catch.

## Risks / Trade-offs

- Chat history is ephemeral until persistence is implemented.
- Sidebar reduces canvas width; acceptable for MVP and can be made collapsible later.
