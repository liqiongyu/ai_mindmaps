## ADDED Requirements

### Requirement: Canvas avoids unnecessary layout recomputation

The canvas MUST avoid expensive layout recomputation when only view state changes (selection, highlight, edit state), to keep large mindmaps responsive.

#### Scenario: Selection change does not trigger layout recalculation

- **WHEN** `selectedNodeId` changes while the underlying `state` does not change
- **THEN** the canvas MUST update selection without recalculating the mindmap layout positions.

#### Scenario: Highlight change does not trigger layout recalculation

- **WHEN** highlight state changes while the underlying `state` does not change
- **THEN** the canvas MUST update node highlight styling without recalculating the mindmap layout positions.

### Requirement: Public viewer stays responsive for large graphs

The public mindmap viewer MUST remain usable for large mindmaps by reusing the optimized canvas path.

#### Scenario: Public viewer renders large mindmaps

- **WHEN** the public viewer renders a mindmap with 500+ nodes
- **THEN** initial render and basic interactions (pan/zoom/select) MUST remain responsive.
