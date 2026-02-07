## ADDED Requirements

### Requirement: Editor records mindmap state history

The mindmap editor SHALL record a history of mindmap state changes to enable undo/redo.

#### Scenario: Manual edit creates a history entry

- **WHEN** the user performs a manual edit that changes the mindmap state
- **THEN** the editor SHALL append a new entry to the undo history and clear the redo history

#### Scenario: AI ops create a history entry

- **WHEN** the editor applies a set of AI-returned operations that changes the mindmap state
- **THEN** the editor SHALL append a new entry to the undo history and clear the redo history

### Requirement: User can undo and redo mindmap changes

The editor SHALL support undoing and redoing mindmap state changes.

#### Scenario: Undo reverts to the previous state

- **WHEN** the user triggers undo and an undo history entry exists
- **THEN** the editor SHALL restore the previous mindmap state

#### Scenario: Redo reapplies an undone state

- **WHEN** the user triggers redo and a redo history entry exists
- **THEN** the editor SHALL restore the next mindmap state

### Requirement: Undo and redo are accessible via UI and keyboard

The editor SHALL provide UI controls and common keyboard shortcuts for undo/redo.

#### Scenario: UI controls reflect availability

- **WHEN** the editor has no undo history entries
- **THEN** the Undo control SHALL be disabled

#### Scenario: Keyboard shortcuts trigger undo/redo

- **WHEN** the user presses the undo/redo keyboard shortcuts while focus is not in an editable field
- **THEN** the editor SHALL perform the corresponding undo/redo action

#### Scenario: Keyboard shortcuts do not override text editing

- **WHEN** the user presses the undo/redo keyboard shortcuts while focus is in an input, textarea, or content-editable element
- **THEN** the editor SHALL NOT perform mindmap undo/redo
