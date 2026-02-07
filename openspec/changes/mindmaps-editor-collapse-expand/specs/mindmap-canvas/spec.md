## ADDED Requirements

### Requirement: User can collapse and expand a node subtree

The editor SHALL allow users to collapse and expand a node’s subtree, affecting what is rendered on the canvas and included in exports.

#### Scenario: Collapse hides descendants

- **WHEN** the user collapses a node
- **THEN** the editor SHALL hide that node’s descendants from the rendered canvas

#### Scenario: Expand shows descendants

- **WHEN** the user expands a previously collapsed node
- **THEN** the editor SHALL render that node’s descendants again

#### Scenario: Export reflects collapsed view

- **WHEN** the user exports the mindmap while some nodes are collapsed
- **THEN** the exported PNG/SVG SHALL reflect the currently collapsed/expanded view
