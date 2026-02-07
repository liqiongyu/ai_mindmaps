## ADDED Requirements

### Requirement: User can add a child node

The editor SHALL allow users to add a child node under the currently selected node.

#### Scenario: Add child under selected node

- **WHEN** a node is selected and the user triggers “Add child”
- **THEN** the editor SHALL add a new node as a child of the selected node

### Requirement: User can rename a node

The editor SHALL allow users to rename the currently selected node.

#### Scenario: Rename selected node

- **WHEN** a node is selected and the user provides a new name
- **THEN** the editor SHALL update the node text to the new value

### Requirement: User can delete a node (non-root)

The editor SHALL allow users to delete the currently selected node, excluding the root node.

#### Scenario: Delete selected node

- **WHEN** a non-root node is selected and the user triggers “Delete”
- **THEN** the editor SHALL remove that node (and its subtree) from the mindmap
