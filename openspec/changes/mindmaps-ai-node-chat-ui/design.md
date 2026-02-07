## Context

- The AI endpoint supports `scope="global"` and `scope="node"` with server-side subtree enforcement.
- The editor currently has a global chat sidebar only.

## Goals / Non-Goals

**Goals:**

- Add a node-scoped mode in the chat sidebar.
- Use the currently selected node as the scope root for node chat.
- Keep UX clear when no node is selected.

**Non-Goals:**

- Persist chat history or add multi-thread UI.

## Decisions

- Implement a simple scope toggle (Global / Node) in the sidebar header.
- Pass `selectedNodeId` (and optionally the selected node label) from the editor to the sidebar.
- Reuse the same message transcript UI; requests differ by payload.

## Risks / Trade-offs

- Node-scoped chat depends on selection state; ensure selection stays valid after ops and fall back to root when needed.
