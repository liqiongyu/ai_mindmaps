## ADDED Requirements

### Requirement: Authenticated users can import a try draft

The system SHALL allow an authenticated user to import a local try-mode draft into a new persisted mindmap.

#### Scenario: Import try draft

- **GIVEN** a user is authenticated
- **WHEN** the user sends `POST /api/mindmaps/import-try` with a valid draft payload
- **THEN** the system SHALL create a new mindmap owned by that user
- **AND** the system SHALL persist the draft nodes atomically
- **AND** the system SHALL return `{ ok: true, mindmapId }`

#### Scenario: Invalid import request

- **WHEN** the user sends an invalid payload to `POST /api/mindmaps/import-try`
- **THEN** the system SHALL return a 4xx response
- **AND** the system SHALL NOT create any mindmap
