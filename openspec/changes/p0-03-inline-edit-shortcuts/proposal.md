## Why

Renaming nodes currently relies on the “Details” modal and the Enter key opens the modal, which breaks common mindmap “muscle memory” and makes keyboard-driven editing slow. We need inline title editing and consistent core shortcuts so users can rapidly build structure without leaving the canvas.

## What Changes

- Add inline node title editing:
  - Double-click a node to edit its title in place
  - Press `F2` to edit the currently selected node title
- Implement baseline keyboard shortcuts (and keep toolbar behavior consistent):
  - `Enter`: add a child node and immediately start editing its title
  - `Tab`: add a sibling node and immediately start editing its title
  - `Backspace/Delete`: delete the selected node (non-root) with undo support
- Change the current behavior where plain `Enter` opens the “Details” modal:
  - “Details” remains available via the toolbar button (and future dedicated shortcut), but not on `Enter`.

## Capabilities

### New Capabilities

- `editor-inline-editing`: Inline title editing and baseline editor keybindings for high-frequency mindmap operations.

### Modified Capabilities

- (none)

## Impact

- Editor UI: `src/app/mindmaps/[mindmapId]/MindmapEditor.tsx` (keybindings, edit state, add/delete flows)
- Canvas rendering: `src/app/mindmaps/[mindmapId]/MindmapCanvas.tsx` (custom node renderer for inline editing)
- Tests: add unit tests for keybinding logic (where feasible) and/or editor utilities
