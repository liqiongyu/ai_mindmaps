## ADDED Requirements

### Requirement: Mindmaps have a monotonically increasing version

Each mindmap MUST have a `version` that increases by 1 after every successful persisted save of mindmap nodes.

#### Scenario: Initial version on creation

- **WHEN** a mindmap is created
- **THEN** its `version` MUST be initialized to `1`

#### Scenario: Version increments on successful save

- **WHEN** a persisted save of mindmap nodes succeeds
- **THEN** the mindmap `version` MUST be incremented by 1 atomically with the save

### Requirement: Save API enforces optimistic concurrency

The persisted save endpoint MUST require a `baseVersion` and MUST prevent silent overwrite when the server-side version is different.

#### Scenario: Successful save with matching baseVersion

- **WHEN** the client calls `POST /api/mindmaps/:id/save` with `baseVersion` equal to the current server version
- **THEN** the API MUST persist the mindmap nodes
- **AND** the API MUST respond with `200` and `{ ok: true, version }` where `version` is the incremented version

#### Scenario: Reject save on version conflict

- **WHEN** the client calls `POST /api/mindmaps/:id/save` with `baseVersion` different from the current server version
- **THEN** the API MUST respond with `409`
- **AND** the response MUST include `{ ok: false, code: "VERSION_CONFLICT", serverVersion }`

#### Scenario: Reject save when baseVersion is missing

- **WHEN** the client calls `POST /api/mindmaps/:id/save` without `baseVersion`
- **THEN** the API MUST respond with `400`

### Requirement: Client provides conflict resolution strategies

When a save request is rejected due to version conflict, the client MUST provide explicit user actions to resolve the conflict.

#### Scenario: Conflict banner is shown and auto-save is paused

- **WHEN** the client receives a `409 VERSION_CONFLICT` response for a persisted save
- **THEN** the client MUST pause automatic retries for persisted saves
- **AND** the client MUST display a message indicating a version conflict blocked the overwrite

#### Scenario: Load latest replaces local state

- **WHEN** the user chooses "Load latest"
- **THEN** the client MUST fetch the latest state from the server
- **AND** the local editor state MUST be replaced by the fetched state

#### Scenario: Overwrite retries with latest baseVersion

- **WHEN** the user chooses "Overwrite"
- **THEN** the client MUST update its `baseVersion` to the provided `serverVersion`
- **AND** the client MUST retry saving the current local state

#### Scenario: Save as copy creates a new mindmap

- **WHEN** the user chooses "Save as copy"
- **THEN** the client MUST create a new mindmap
- **AND** the client MUST persist the current local state into the new mindmap
