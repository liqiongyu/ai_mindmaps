## Context

The editor currently renders a sample mindmap and supports node selection. The next MVP step is making the canvas minimally editable (add/rename/delete) while keeping behavior consistent with the ops protocol already implemented in `src/lib/mindmap/ops.ts`.

## Goals / Non-Goals

**Goals:**

- Provide UI actions to add, rename, and delete nodes.
- Implement manual edits by generating `Operation[]` and applying them via `applyOperations()` (shared path with future AI ops).
- Keep the canvas layout deterministic by re-running the existing layout conversion after each state change.

**Non-Goals:**

- Drag/drop repositioning or complex reorder UX.
- Undo/redo (separate change).
- Persistence (Supabase) or multi-user collaboration.

## Decisions

- Introduce a single client “editor shell” component that owns mindmap state and selection, and renders:
  - a small toolbar (Add child / Rename / Delete)
  - the React Flow canvas
- Use `crypto.randomUUID()` to generate new node ids on the client.
- Keep initial state as `sampleMindmapState` until persistence is added.

## Risks / Trade-offs

- [Risk] Using prompt/alert based UX is minimal. → Mitigation: keep actions isolated; replace with proper dialogs later without changing core ops logic.
- [Risk] Layout re-computation on every change may be expensive for large maps. → Mitigation: acceptable for MVP; optimize later if needed.
