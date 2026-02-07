## Context

- The editor currently applies manual edits and AI ops directly to in-memory state with no undo/redo.
- MVP acceptance requires undo/redo, and AI + manual changes must share the same history stack.
- The editor includes text inputs (rename prompts, chat textarea) where native undo behavior should remain intact.

## Goals / Non-Goals

**Goals:**

- Maintain a bounded undo/redo history for mindmap state changes.
- Record both manual actions and AI-applied ops as history entries.
- Provide UI controls and keyboard shortcuts for undo/redo.
- Avoid breaking existing autosave behavior (persisted mode should save the current “present” state).

**Non-Goals:**

- Persist history across page reloads (history resets on load).
- Persist chat transcripts in the database (separate feature).
- Fine-grained operation-level inversion; MVP uses state snapshots.

## Decisions

- Snapshot-based history: store `past[]`, `present`, `future[]` of `MindmapState` to keep implementation simple and deterministic for MVP.
- Bounded history: cap `past` length (e.g., 50) to avoid unbounded memory growth.
- Treat selection separately from history: undo/redo restores mindmap state; selection is clamped to an existing node (fallback to root if missing).
- Keyboard handling should not interfere with text editing: ignore undo/redo shortcuts when the event target is an `input`, `textarea`, or `contentEditable` element.

## Risks / Trade-offs

- [Large mindmaps increase snapshot size] → Mitigation: bound history size and keep MVP mindmaps small.
- [Undo shortcut collides with chat/inputs] → Mitigation: target-gating for editable elements so native text undo continues to work.
- [Selection may feel “off” after undo/redo] → Mitigation: clamp selection to an existing node and consider selection-in-history later if needed.
