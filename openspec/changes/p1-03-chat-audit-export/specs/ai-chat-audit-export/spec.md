## ADDED Requirements

### Requirement: Export chat audit JSON for a thread

The system MUST allow an authenticated owner to export the persisted chat thread (timeline) as a JSON audit record.

#### Scenario: Successful export for global scope

- **WHEN** an authenticated user calls `GET /api/ai/chat/export?mindmapId=<id>&scope=global`
- **THEN** the server MUST return a JSON payload containing the thread metadata and ordered messages with `provider`, `model`, and `createdAt`.

#### Scenario: Successful export for node scope

- **WHEN** an authenticated user calls `GET /api/ai/chat/export?mindmapId=<id>&scope=node&selectedNodeId=<nodeId>`
- **THEN** the server MUST return a JSON payload containing the node-scoped thread metadata and ordered messages.

### Requirement: Export is owner-scoped

The export endpoint MUST not allow reading chat audit data for a mindmap owned by another user.

#### Scenario: Non-owner cannot export

- **WHEN** an authenticated user calls `GET /api/ai/chat/export` for a mindmap they do not own
- **THEN** the server MUST return an error response and MUST NOT include any thread/messages data.

### Requirement: Export output includes operations for assistant messages

Assistant messages MUST include the `operations` array so the audit record can be replayed or reviewed.

#### Scenario: Assistant message includes ops

- **WHEN** the export JSON contains an assistant message
- **THEN** that message MUST include an `operations` field with the operation array that was persisted.
