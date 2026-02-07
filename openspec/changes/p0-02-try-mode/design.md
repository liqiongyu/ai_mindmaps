## Context

Today, the mindmap editor routes require authentication. We already have a non-persisted editor mode (`mode="demo"`) that uses in-memory history. For P0 conversion, we need an unauthenticated `/try` route that feels like the editor, and a local draft that survives refresh via `localStorage`.

The execution plan defines the P0 try-mode boundary and a storage contract:

- Route: `GET /try`
- Storage key: `mma:try:draft:v1`
- Persisted shape: `{ state, updatedAt, ui: { collapsedNodeIds, selectedNodeId } }`

## Goals / Non-Goals

**Goals:**

- Make `/try` accessible without login and immediately editable.
- Persist draft state + minimal UI state to `localStorage` with a small debounce.
- Add a clear top banner explaining that login unlocks AI + cloud save.
- Keep AI and sharing disabled in try mode (P0 strategy A).

**Non-Goals:**

- Guest AI access, quotas, or rate limiting (P1).
- Importing the local draft into a logged-in mindmap (P1/P2).
- Server-side persistence for try-mode drafts.
- Rewriting the editor architecture (extracting a full design system, etc.).

## Decisions

- Add a new editor mode: `mode="try"`.
  - Rationale: keep semantics distinct from `demo` (no persistence) and `persisted` (server-backed).
- Implement local draft parsing/serialization in `src/lib/mindmap/tryDraft.ts` using Zod.
  - Rationale: consistent validation with existing `MindmapStateSchema`, and testable parsing without a browser.
- Persist drafts via a debounced `useEffect` in `MindmapEditor` when in try mode.
  - Rationale: avoids adding state management dependencies and minimizes write frequency during frequent edits.
- Persist UI state as arrays (`collapsedNodeIds: string[]`) and reconstruct `Set` in memory.
  - Rationale: JSON-friendly storage while keeping efficient lookups in the editor.

## Risks / Trade-offs

- [Risk] `localStorage` may be unavailable or quota-limited, causing save failures. → Mitigation: catch write errors and surface a non-blocking error banner; keep editor functional in-memory.
- [Risk] Draft schema changes over time. → Mitigation: version the key (`v1`) and validate strictly; later add migrations per version.
- [Risk] Frequent state changes could cause excessive writes. → Mitigation: debounce saves and only store minimal UI state.
