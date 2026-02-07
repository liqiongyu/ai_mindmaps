## ADDED Requirements

### Requirement: User can edit selected node title

The editor SHALL provide a node inspector UI that allows the user to edit the selected node’s title.

When saved, the title change SHALL be applied as a `rename_node` operation to preserve undo/redo behavior.

#### Scenario: Rename selected node

- **WHEN** the user opens the node inspector and changes the title of the selected node and saves
- **THEN** the mindmap state SHALL update the node text to the new title

### Requirement: User can edit selected node notes

The editor SHALL provide a node inspector UI that allows the user to edit the selected node’s notes as plain markdown text.

When saved, the notes change SHALL be applied as an `update_notes` operation to preserve undo/redo behavior.

#### Scenario: Update selected node notes

- **WHEN** the user opens the node inspector and edits notes for the selected node and saves
- **THEN** the mindmap state SHALL update the node notes to the new value
