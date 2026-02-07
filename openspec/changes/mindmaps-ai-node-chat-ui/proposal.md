## Why

MVP includes node-scoped chat: users select a node and ask the AI to expand that subtree only. Backend scope enforcement exists, but the UI only supports global chat today.

## What Changes

- Extend the editor chat sidebar with a “Node” scope mode.
- Send node-scoped requests to `POST /api/ai/chat` with `scope="node"` and `selectedNodeId`.
- Surface the selected node context and disable node chat when nothing is selected.

## Capabilities

### New Capabilities

- `ai-node-chat-ui`: Node-scoped chat UI that only affects the selected subtree.

### Modified Capabilities

- (none)

## Impact

- Updates `MindmapChatSidebar` and related editor wiring.
