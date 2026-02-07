## ADDED Requirements

### Requirement: Persisted mindmap restores view state on load

For authenticated persisted mindmaps, the editor SHALL restore the last saved view state (collapsed nodes, selected node, and viewport) when opening the mindmap.

#### Scenario: Restore collapsed + selected on load

- **WHEN** a user opens `/mindmaps/:id` for a mindmap with saved UI state
- **THEN** the editor restores `collapsedNodeIds` and `selectedNodeId` (when valid), falling back to the root node when invalid

#### Scenario: Restore viewport on load

- **WHEN** a user opens `/mindmaps/:id` for a mindmap with a saved viewport
- **THEN** the canvas initializes to the saved viewport instead of forcing `fitView`

### Requirement: Persisted mindmap saves view state changes

For authenticated persisted mindmaps, the editor SHALL save view state changes to the backend automatically after a short debounce.

#### Scenario: Save after view state changes

- **WHEN** the user changes collapsed nodes, selection, or viewport
- **THEN** the editor persists the updated UI state to the backend after a short debounce

### Requirement: Try mode persists view state locally

In try mode, the editor SHALL persist view state to `localStorage` as part of the try draft.

#### Scenario: Restore view state in try mode

- **WHEN** a user refreshes `/try`
- **THEN** the editor restores the last saved collapsed nodes, selected node, and viewport from `localStorage`
