## ADDED Requirements

### Requirement: Editor toolbar is grouped

The editor toolbar SHALL be grouped into clear sections to reduce information density:
`编辑 / 结构 / 视图 / 导出 / 分享`.

#### Scenario: Grouped toolbar visible

- **WHEN** a user opens the mindmap editor
- **THEN** the toolbar presents actions grouped by category (with visible group labels)

### Requirement: Dangerous operations are behind a kebab menu

Dangerous operations (e.g. deleting nodes or deleting a mindmap) MUST be placed behind a secondary menu entry (kebab menu) to reduce misclicks.

#### Scenario: Dangerous operations are not primary buttons

- **WHEN** a user views the primary toolbar buttons
- **THEN** delete actions are not shown as one-click primary buttons

#### Scenario: Dangerous operations are reachable via menu

- **WHEN** a user opens the kebab menu
- **THEN** they can access delete actions from the menu

### Requirement: Tooltip and hotkey hints are consistent

Toolbar actions SHALL expose consistent tooltip text, and include hotkey hints when a shortcut exists.

#### Scenario: Hotkey actions include shortcut hints

- **WHEN** a user hovers a toolbar action that has a shortcut (e.g. undo/redo/add/delete)
- **THEN** the tooltip includes the shortcut hint in a consistent format
