## Context

The editor currently supports selecting nodes and performing structural operations via toolbar buttons. Renaming is primarily done through the “Details” modal, and the global keybinding for plain `Enter` opens that modal. This blocks efficient keyboard-first editing and diverges from typical mindmap editing workflows.

We render nodes using React Flow’s default node UI. To support in-place title editing, we need a custom node renderer that can switch between a text view and an input field with focus management.

## Goals / Non-Goals

**Goals:**

- Inline title editing triggered by node double-click or `F2`.
- Keyboard shortcuts for high-frequency actions:
  - `Enter`: add child and start editing the new node
  - `Tab`: add sibling and start editing the new node
  - `Backspace/Delete`: delete selected (non-root) node with undo support
- Keep toolbar button behavior consistent with shortcuts (same semantics, same undo stack).
- Remove the conflict where `Enter` opens “Details”.

**Non-Goals:**

- Full keybinding customization, command palette, or advanced keyboard navigation.
- Changing the underlying ops protocol or history model.
- Adding “guest AI” or additional side panels beyond what’s needed for P0.

## Decisions

- Use a custom React Flow node type for mindmap nodes.
  - Rationale: enables rendering an `<input>` inline and handling double-click and edit events locally.
- Keep edit state (`editingNodeId`) in `MindmapEditor` and pass it down to `MindmapCanvas`.
  - Rationale: keybindings (F2/Enter/Tab) and ops application live in the editor layer; keeping a single source of truth avoids desync.
- Handle `Enter`/`Tab` inside the inline input to support fast “commit + add next node” flows.
  - Rationale: global keybindings intentionally ignore focused inputs; the edit input must implement the expected behavior.
- Keep “Details” modal accessible via toolbar button only (P0).
  - Rationale: avoids conflicting with `Enter` and keeps advanced fields (notes) in a dedicated UI.

## Risks / Trade-offs

- [Risk] Overriding `Tab` can impact keyboard accessibility and focus navigation. → Mitigation: only intercept `Tab` in the editor’s keybinding handler (not in general site navigation) and keep it scoped to the editor surface.
- [Risk] Focus management bugs (input not focusing, accidental blur commits). → Mitigation: use `autoFocus` + ref focusing on edit start and commit on blur with safe trimming.
- [Risk] Deleting without confirmation could surprise users. → Mitigation: deletion is undoable; later iterations can add “danger action” affordances if needed.
