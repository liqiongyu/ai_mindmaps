## Why

MVP requires a global chat experience where a user types a message, the AI returns validated ops, and the mindmap updates in-place. We have the backend ops API, but the editor has no chat UI yet.

## What Changes

- Add a global chat panel in the mindmap editor UI.
- Send user messages to `POST /api/ai/chat` and apply returned `operations[]` to the local `MindmapState`.
- Surface loading/error states and show a simple message history (not persisted yet).

## Capabilities

### New Capabilities

- `ai-chat-ui`: Global chat panel in the editor that applies AI ops to the mindmap.

### Modified Capabilities

- (none)

## Impact

- Modifies the persisted editor UI under `src/app/mindmaps/[mindmapId]/`.
- May adjust canvas layout to accommodate the chat panel.
