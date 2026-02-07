## ADDED Requirements

### Requirement: Change summary is visible after AI applies ops

After AI operations are applied, the UI MUST show a concise summary of what changed.

#### Scenario: Show summary for assistant message

- **GIVEN** an assistant message includes `operations`
- **WHEN** the assistant message is rendered in the chat sidebar
- **THEN** the UI shows `新增/改名/移动/删除` counts derived from the operations

### Requirement: Highlight changed nodes briefly

The editor MUST highlight nodes affected by AI operations so users can visually locate changes.

#### Scenario: Highlight after applying operations

- **WHEN** AI operations are successfully applied to the mindmap state
- **THEN** nodes referenced by `add_node` / `rename_node` / `move_node` are highlighted for 3–5 seconds

### Requirement: Safety mode rejects delete_node by default

For safety, the system MUST reject AI outputs that attempt to delete nodes.

#### Scenario: Reject delete_node operations

- **GIVEN** the model output includes at least one `delete_node` operation
- **WHEN** the server validates the operations
- **THEN** the server returns HTTP 400 with a clear message instructing the user to refine intent

### Requirement: Node scope operations must not escape the selected subtree

Node-scoped chat MUST NOT be allowed to modify nodes outside the selected subtree.

#### Scenario: Reject out-of-scope operations

- **GIVEN** scope is `node` with a selected node id
- **WHEN** operations reference nodes outside the selected subtree
- **THEN** the server returns HTTP 400 and does not apply/persist invalid operations
