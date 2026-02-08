## Context

We already persist chat threads/messages (when the schema is available) and the sidebar can display messages with ops, provider/model, and timestamps. What’s missing is a stable way to export a whole thread as a JSON audit record for debugging/review/compliance workflows.

## Goals / Non-Goals

**Goals:**

- Add `GET /api/ai/chat/export` that returns a complete, ordered audit payload for the active thread.
- Ensure owner-only access (auth + mindmap ownership check).
- Add a sidebar action to download the audit JSON for the current scope/thread.

**Non-Goals:**

- Server-side PDF/CSV export formats (JSON only).
- Exporting the full mindmap snapshot (only chat timeline + ops).
- Provider-backed E2E tests (unit tests only).

## Decisions

1. **Implement as a separate route**
   - Route: `src/app/api/ai/chat/export/route.ts`
   - Reuse query logic from `GET /api/ai/chat` to locate the thread and message rows.

2. **Stable payload shape (versioned)**
   - Include a top-level `version` and `exportedAt` to allow future evolution without breaking consumers.

3. **Download via browser blob**
   - Frontend fetches JSON, creates a Blob, and triggers a download with a deterministic filename.
   - Keeps implementation simple and avoids relying on server Content-Disposition behavior across environments.

## Risks / Trade-offs

- [Risk] Chat persistence schema may be missing in some environments → Mitigation: return a clear error and keep UI warning consistent with existing “not persisted” banner.
- [Risk] Large audit payloads for long threads → Mitigation: keep payload minimal (no mindmap snapshot) and rely on pagination in future if needed.
