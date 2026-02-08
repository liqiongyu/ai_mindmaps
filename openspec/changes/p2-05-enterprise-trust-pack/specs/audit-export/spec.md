## ADDED Requirements

### Requirement: Only owners can export audit logs

The system MUST allow an authenticated user to export audit logs only for mindmaps they own.

#### Scenario: Non-owner cannot export

- **WHEN** a user requests audit export for a mindmap they do not own
- **THEN** the server rejects the request (e.g., `404` mindmap not found)

### Requirement: Audit export contains required metadata

Audit export payload MUST include timestamps and model/provider metadata for messages, and include operations for assistant messages.

#### Scenario: Successful export includes provider/model and operations

- **WHEN** a user exports a chat audit record successfully
- **THEN** the payload contains `provider`, `model`, `createdAt`, and `operations` (for assistant messages)
