## ADDED Requirements

### Requirement: Mindmap editor route renders a canvas

The application SHALL provide a mindmap editor route that renders a mindmap on a canvas using `@xyflow/react`.

#### Scenario: Open the editor

- **WHEN** a user navigates to the editor route
- **THEN** the page SHALL render a mindmap canvas with at least a root node

### Requirement: Canvas supports pan/zoom

The mindmap canvas SHALL support panning and zooming interactions.

#### Scenario: Pan and zoom

- **WHEN** the user drags the canvas or uses the mouse wheel/trackpad
- **THEN** the canvas viewport SHALL pan/zoom accordingly

### Requirement: Nodes and edges reflect the tree structure

For a given mindmap tree, the renderer SHALL display one node per mindmap node and connect each node to its parent with an edge.

#### Scenario: Parent/child edge is rendered

- **WHEN** the mindmap contains a parent node with a child node
- **THEN** the canvas SHALL render an edge between the parent and child

### Requirement: Node selection is supported

The renderer SHALL allow selecting a node to establish UI focus for future editing features.

#### Scenario: Select a node

- **WHEN** the user clicks a node
- **THEN** the node SHALL become selected in the UI state
