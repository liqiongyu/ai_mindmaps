## Context

- Manual node edits in the editor currently use browser `prompt()` / `confirm()` dialogs.
- Nodes support `notes` in storage and ops (`update_notes`), but the UI does not expose notes editing or inspection.
- Undo/redo is already implemented via a shared history stack; manual and AI edits should remain consistent.

## Goals / Non-Goals

**Goals:**

- Provide a simple node inspector UI for the selected node that supports:
  - Editing the node title (rename)
  - Editing the node notes (markdown text)
- Apply changes via existing ops (`rename_node`, `update_notes`) so they:
  - Validate through existing logic
  - Participate in undo/redo
  - Persist through the existing save pipeline

**Non-Goals:**

- Rich markdown rendering, attachments, or advanced note formatting UI.
- Changing mindmap layout or introducing free-form node positioning.
- Overhauling all prompt-based actions (add/delete can remain as-is for now).

## Decisions

- Implement the inspector as a lightweight modal in `MindmapEditor` to keep the layout stable and avoid adding another permanent sidebar.
- Use local, controlled form state while the modal is open; only commit ops on explicit “Save”:
  - If title changed → `rename_node`
  - If notes changed → `update_notes`
- Treat “no selected node” as a blocked state (disable opening inspector).
- Keep the modal client-only and avoid new dependencies.

## Risks / Trade-offs

- [User closes modal with unsaved changes] → Mitigation: require explicit Save; optionally confirm on close if dirty (future enhancement).
- [Undo granularity] → Mitigation: saving applies up to two ops in one commit; acceptable for MVP.

## Migration Plan

- No schema changes; deploy UI-only update.
- Existing data (`mindmap_nodes.notes`) remains compatible.
