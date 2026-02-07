## ADDED Requirements

### Requirement: Canvas uses a left/right mindmap layout

The renderer SHALL position the root topic as the center anchor and distribute top-level branches to both the left and the right.

#### Scenario: Root-level branches render on both sides

- **WHEN** the mindmap root has multiple direct children
- **THEN** the canvas SHALL render at least one branch to the left of the root and at least one branch to the right of the root

#### Scenario: Descendants inherit their side

- **WHEN** a node is rendered on the left (or right) side of the root
- **THEN** its descendants SHALL also render on the same side of the root
