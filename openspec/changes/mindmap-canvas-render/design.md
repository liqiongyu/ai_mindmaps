## Context

The app currently only renders a placeholder home page. To build toward the MVP editor, we need a minimal mindmap canvas renderer using `@xyflow/react` that can display a tree and support basic interactions (pan/zoom, selection).

## Goals / Non-Goals

**Goals:**

- Add an editor route that renders a sample mindmap on a React Flow canvas.
- Convert `MindmapState` (tree) into React Flow nodes + edges.
- Provide deterministic layout positions for nodes (simple first pass; improved layout can iterate later).
- Track selected node id in UI state.

**Non-Goals:**

- Persistence (Supabase) and real mindmap IDs.
- Full editing (add/rename/move/delete) and undo/redo.
- AI chat integration.

## Decisions

- Use `src/app/mindmaps/[mindmapId]/page.tsx` as the editor route (future-proof for real IDs).
  - For this change, the page renders a sample in-memory mindmap regardless of id.
- Use a client component (`MindmapCanvas`) to host React Flow.
  - Rationale: React Flow requires browser APIs and interaction handlers.
- Add a small `MindmapState` → `{ nodes, edges }` adapter + layout helper under `src/lib/mindmap/`.
  - Rationale: keeps UI rendering decoupled from the domain model and enables reuse by future persistence/AI work.

## Risks / Trade-offs

- [Risk] Layout quality is limited in the first iteration. → Mitigation: keep layout logic isolated and evolve it (e.g., left/right tree) without changing the rest of the editor.
- [Risk] Client/server boundary complexity in App Router. → Mitigation: keep the page itself server-rendered and push interactive logic into a single client component.
