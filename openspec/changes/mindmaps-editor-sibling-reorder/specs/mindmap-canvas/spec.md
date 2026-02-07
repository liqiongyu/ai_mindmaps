## ADDED Requirements

### Requirement: User can add a sibling node (non-root)

The editor SHALL allow users to add a sibling node adjacent to the currently selected node, excluding the root node.

#### Scenario: Add sibling after selected node

- **WHEN** a non-root node is selected and the user triggers “Add sibling”
- **THEN** the editor SHALL add a new node under the selected node’s parent, positioned immediately after the selected node

### Requirement: User can reorder siblings

The editor SHALL allow users to reorder the selected node among its siblings.

#### Scenario: Move selected node up

- **WHEN** a non-root node is selected and the user triggers “Move up”
- **THEN** the editor SHALL reorder the parent’s children so the selected node is one position earlier among siblings

#### Scenario: Move selected node down

- **WHEN** a non-root node is selected and the user triggers “Move down”
- **THEN** the editor SHALL reorder the parent’s children so the selected node is one position later among siblings

#### Scenario: Move up/down at boundaries is a no-op

- **WHEN** the selected node is already the first (or last) sibling and the user triggers “Move up” (or “Move down”)
- **THEN** the editor SHALL not change the sibling order
