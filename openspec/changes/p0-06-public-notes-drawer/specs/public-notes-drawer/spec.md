## ADDED Requirements

### Requirement: Clicking a node shows its notes

The public viewer MUST allow selecting a node and reading its notes.

#### Scenario: Show notes for selected node

- **GIVEN** a public mindmap is loaded
- **WHEN** the user clicks a node
- **THEN** the UI shows that node’s notes content (or an empty-state message)

### Requirement: Breadcrumb path is shown

The notes panel MUST display a breadcrumb path for the selected node.

### Requirement: Public view remains read-only

The public page MUST NOT expose editing controls or chat UI.
