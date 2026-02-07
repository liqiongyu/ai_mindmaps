## Why

The PRD calls for a node inspector (title/notes editing), but today manual edits rely on browser prompts and node notes are not editable/visible in the UI. This limits usability and makes AI-driven `update_notes` changes hard to inspect.

## What Changes

- Add a lightweight **node inspector UI** for the currently selected node:
  - Edit node title (maps to `rename_node`)
  - Edit node notes (markdown text; maps to `update_notes`)
- Keep edits undoable/redoable and persisted through the existing save pipeline.

## Capabilities

### New Capabilities

- `node-inspector`: A node details editor (title + notes) for the selected mindmap node.

### Modified Capabilities

- (none)

## Impact

- Updates editor UI (`src/app/mindmaps/[mindmapId]/MindmapEditor.tsx`) and adds a small inspector component.
- No database/schema changes; reuses existing `mindmap_nodes.notes` and ops (`rename_node`, `update_notes`).
