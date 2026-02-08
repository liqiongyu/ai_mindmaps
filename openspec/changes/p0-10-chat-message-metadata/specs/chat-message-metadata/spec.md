## ADDED Requirements

### Requirement: Chat messages support extensible metadata

The system MUST store an extensible `metadata` JSON object on persisted chat messages for auditability and future extensions.

#### Scenario: Persisted chat messages include metadata field

- **WHEN** the server persists a chat message to `chat_messages`
- **THEN** the record includes a `metadata` field (defaulting to `{}` when unset)

### Requirement: Assistant messages persist constraints and change summary

The system MUST persist the assistant message’s constraints snapshot and change summary in `chat_messages.metadata`.

#### Scenario: Assistant metadata contains constraints and summary

- **WHEN** an assistant message with `operations[]` is persisted
- **THEN** `metadata.constraints` and `metadata.changeSummary` are stored for that message

### Requirement: Audit export includes message metadata

The system MUST include persisted message metadata in audit exports, and remain backward compatible with older records.

#### Scenario: Export includes metadata when present

- **WHEN** the user exports an audit JSON for a chat thread
- **THEN** the exported messages include `metadata` fields when available

#### Scenario: Export remains compatible when metadata is missing

- **WHEN** the exported records do not have metadata (older messages)
- **THEN** the export still succeeds and omits/empties metadata safely

### Requirement: History UI displays persisted constraint summary

The system MUST allow the UI to display constraint summaries from persisted history when available.

#### Scenario: UI shows constraints summary after refresh

- **WHEN** the user refreshes and chat history is loaded
- **THEN** assistant messages with persisted `metadata.constraints` display a constraints summary
