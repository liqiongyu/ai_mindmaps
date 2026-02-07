## ADDED Requirements

### Requirement: Editor provides global chat input

The editor SHALL provide a global chat UI for the current mindmap.

#### Scenario: User sends a global message

- **WHEN** the user submits a message in the global chat panel
- **THEN** the client SHALL call `POST /api/ai/chat` with `scope = "global"`

### Requirement: AI ops update the mindmap

The editor SHALL apply returned `operations[]` to the current `MindmapState` on success.

#### Scenario: Apply ops successfully

- **WHEN** the AI API returns `{ assistant_message, operations[] }`
- **THEN** the editor SHALL apply the operations and re-render the updated mindmap

### Requirement: Errors are surfaced without mutating state

If the AI request fails or returns invalid ops, the editor SHALL show an error and SHALL NOT change the mindmap state.

#### Scenario: AI call fails

- **WHEN** the AI API returns an error
- **THEN** the editor SHALL display an error message and keep the current mindmap unchanged
