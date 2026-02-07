## ADDED Requirements

### Requirement: Inline node title editing

The editor SHALL allow users to edit a node title in place without opening a modal.

#### Scenario: Double-click to edit node title

- **WHEN** the user double-clicks a node
- **THEN** the node enters an inline title editing mode

#### Scenario: F2 edits the selected node title

- **WHEN** the user presses `F2` with a node selected
- **THEN** the selected node enters inline title editing mode

### Requirement: Enter adds a child node and starts editing

The editor MUST support adding a child node via `Enter` and immediately start inline editing on the newly created node.

#### Scenario: Enter adds child and focuses inline editor

- **WHEN** the user presses `Enter` with a node selected
- **THEN** the editor adds a child node and focuses inline title editing on the new node

### Requirement: Tab adds a sibling node and starts editing

The editor MUST support adding a sibling node via `Tab` and immediately start inline editing on the newly created node (when a sibling is valid).

#### Scenario: Tab adds sibling and focuses inline editor

- **WHEN** the user presses `Tab` with a non-root node selected
- **THEN** the editor adds a sibling node and focuses inline title editing on the new node

### Requirement: Delete removes selected node with undo support

The editor MUST support deleting the selected node via `Backspace` or `Delete` (except the root node), and the deletion MUST be undoable via the undo stack.

#### Scenario: Delete removes selected node

- **WHEN** the user presses `Backspace` or `Delete` with a non-root node selected
- **THEN** the editor deletes the selected node (and its subtree) and the action can be undone

### Requirement: Root node cannot be deleted or moved

The editor MUST NOT allow deleting or moving the root node.

#### Scenario: Root node deletion is rejected

- **WHEN** the user attempts to delete the root node
- **THEN** the editor rejects the action

### Requirement: Enter does not open the Details modal

Plain `Enter` MUST NOT open the node “Details” modal.

#### Scenario: Enter does not trigger Details

- **WHEN** the user presses `Enter` with a node selected
- **THEN** the Details modal does not open
