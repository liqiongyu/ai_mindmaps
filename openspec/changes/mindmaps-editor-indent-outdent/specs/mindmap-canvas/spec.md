## ADDED Requirements

### Requirement: User can indent a node (non-root)

The editor SHALL allow users to indent the selected node by making it a child of its previous sibling, excluding the root node.

#### Scenario: Indent selected node under previous sibling

- **WHEN** a non-root node is selected, it has a previous sibling, and the user triggers “Indent”
- **THEN** the editor SHALL move the selected node under that previous sibling as a child node

#### Scenario: Indent at boundary is a no-op

- **WHEN** the selected node is already the first sibling and the user triggers “Indent”
- **THEN** the editor SHALL not change the mindmap structure

### Requirement: User can outdent a node

The editor SHALL allow users to outdent the selected node by moving it up one level, becoming a sibling after its current parent.

#### Scenario: Outdent selected node to grandparent

- **WHEN** a non-root node is selected, its parent is not the root node, and the user triggers “Outdent”
- **THEN** the editor SHALL move the selected node under its grandparent, positioned immediately after its former parent

#### Scenario: Outdent at boundary is a no-op

- **WHEN** the selected node’s parent is the root node and the user triggers “Outdent”
- **THEN** the editor SHALL not change the mindmap structure
