## ADDED Requirements

### Requirement: Editor supports node-scoped chat mode

The editor chat sidebar SHALL provide a node-scoped mode that targets the currently selected node.

#### Scenario: Node mode requires selection

- **WHEN** the user switches to node-scoped chat with no node selected
- **THEN** the UI SHALL disable sending and prompt the user to select a node

### Requirement: Node-scoped requests include selectedNodeId

Node-scoped chat requests SHALL include `selectedNodeId` and `scope="node"`.

#### Scenario: Send node-scoped message

- **WHEN** the user sends a message in node-scoped mode
- **THEN** the client SHALL call `POST /api/ai/chat` with `scope="node"` and `selectedNodeId`

### Requirement: Node-scoped ops apply to current mindmap

On success, returned ops SHALL be applied to the in-memory mindmap state.

#### Scenario: Apply node-scoped ops

- **WHEN** the AI API returns ops for node scope
- **THEN** the editor SHALL apply them and re-render the updated mindmap
