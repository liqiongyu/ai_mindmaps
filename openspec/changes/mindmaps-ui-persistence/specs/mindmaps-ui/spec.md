## ADDED Requirements

### Requirement: Users can create a mindmap from the UI

The UI SHALL allow an authenticated user to create a new mindmap and open it in the editor.

#### Scenario: Create from list page

- **WHEN** the user clicks “New mindmap” on `/mindmaps`
- **THEN** the system SHALL create a mindmap via `POST /api/mindmaps` and navigate to `/mindmaps/:id`

### Requirement: Users can load and edit a persisted mindmap

The editor UI SHALL load mindmap state from the API and render it for editing.

#### Scenario: Load mindmap into editor

- **WHEN** the user visits `/mindmaps/:id`
- **THEN** the editor SHALL fetch state via `GET /api/mindmaps/:id` and render the mindmap

### Requirement: Edits are automatically saved

The editor UI SHALL persist edits to the backend automatically.

#### Scenario: Auto-save after edit

- **WHEN** the user performs an edit that changes the mindmap state
- **THEN** the editor SHALL call `POST /api/mindmaps/:id/save` after a short debounce and surface save status

### Requirement: Demo editor remains available

The system SHALL keep a demo editor route that does not depend on Supabase.

#### Scenario: Open demo editor

- **WHEN** the user visits `/mindmaps/demo`
- **THEN** the editor SHALL load a sample in-memory mindmap without calling persistence APIs
