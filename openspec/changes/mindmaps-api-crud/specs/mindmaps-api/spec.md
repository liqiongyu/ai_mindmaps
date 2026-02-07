## ADDED Requirements

### Requirement: Authenticated users can create mindmaps

The system SHALL expose an authenticated API to create a new mindmap with an initial root node.

#### Scenario: Create mindmap

- **WHEN** an authenticated user sends `POST /api/mindmaps`
- **THEN** the system SHALL return a new `mindmapId` and `rootNodeId`

### Requirement: Authenticated users can list their mindmaps

The system SHALL expose an authenticated API for listing the current user's mindmaps.

#### Scenario: List mindmaps

- **WHEN** an authenticated user sends `GET /api/mindmaps`
- **THEN** the system SHALL return only mindmaps owned by that user

### Requirement: Authenticated users can load a mindmap state

The system SHALL expose an authenticated API to load a mindmap (mindmap metadata + node rows) and reconstruct `MindmapState`.

#### Scenario: Load mindmap state

- **WHEN** an authenticated owner sends `GET /api/mindmaps/:id`
- **THEN** the system SHALL return the mindmap's `rootNodeId` and `nodesById`

### Requirement: Authenticated users can save a mindmap state

The system SHALL expose an authenticated API to persist a mindmap state.

#### Scenario: Save mindmap state

- **WHEN** an authenticated owner sends `POST /api/mindmaps/:id/save` with a valid `MindmapState`
- **THEN** the system SHALL persist the node set for that mindmap

### Requirement: Public mindmaps can be loaded by slug

The system SHALL expose a public API to load a read-only mindmap by its `public_slug`.

#### Scenario: Load public mindmap

- **WHEN** a user sends `GET /api/public/:slug` for a mindmap with `is_public = true`
- **THEN** the system SHALL return the mindmap state without requiring authentication

### Requirement: Invalid requests are rejected

APIs that accept JSON bodies SHALL validate inputs and reject invalid payloads.

#### Scenario: Invalid request body

- **WHEN** a client sends an invalid JSON body to an API endpoint
- **THEN** the system SHALL return a 4xx response and SHALL NOT write to the database
