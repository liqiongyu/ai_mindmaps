## ADDED Requirements

### Requirement: Save replaces nodes atomically

Saving a mindmap SHALL replace the persisted node set as an all-or-nothing operation.

#### Scenario: Successful save updates all nodes

- **WHEN** the user saves a mindmap successfully
- **THEN** all nodes in the persisted mindmap SHALL match the client-provided state

#### Scenario: Failed save does not partially delete nodes

- **WHEN** a save attempt fails
- **THEN** the persisted mindmap SHALL NOT be left in a partially deleted or empty state

### Requirement: Save enforces ownership

The save operation SHALL only be allowed for the owner of the mindmap.

#### Scenario: Non-owner save is rejected

- **WHEN** an authenticated user attempts to save a mindmap they do not own
- **THEN** the server SHALL reject the request
