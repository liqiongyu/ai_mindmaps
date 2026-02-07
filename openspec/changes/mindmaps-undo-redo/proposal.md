## Why

MVP requires users to undo/redo both manual edits and AI-applied ops. Today, edits are applied immediately with no history, so mistakes are costly and experimentation is discouraged.

## What Changes

- Introduce an editor history stack that supports undo/redo for mindmap state changes.
- Ensure both manual editing actions and AI-applied ops create history entries.
- Add undo/redo UI controls (toolbar buttons) and common keyboard shortcuts.

## Capabilities

### New Capabilities

- `mindmap-undo-redo`: Undo/redo behavior for the mindmap editor, including AI and manual operations in a unified history stack.

### Modified Capabilities

- (none)

## Impact

- Updates the editor state management in `MindmapEditor` to track history (past/present/future) and expose undo/redo actions.
- Adds/updates UI controls and keyboard handling in the editor page.
- Adds unit tests for history behavior (undo/redo stack correctness and integration with ops application).
