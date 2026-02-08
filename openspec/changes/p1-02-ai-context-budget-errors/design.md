## Context

We already generate a slimmed mindmap outline for `/api/ai/chat`, but large mindmaps can still cause reliability issues:

- Context can grow unexpectedly (e.g. large sibling lists in node scope).
- When requests fail (context too large, truncated output, empty output), the UI feedback is not consistently actionable.
- Error codes are not standardized for these failure modes, making UX and telemetry harder.

This change adds explicit context budgets and standardized error codes + recovery hints.

## Goals / Non-Goals

**Goals:**

- Enforce deterministic context budgets (lines + characters) for both `global` and `node` scopes.
- Prefer quality: if a minimum-useful context cannot fit, fail fast with `context_too_large` + recovery hints.
- Standardize `/api/ai/chat` error codes for truncated/empty model outputs.
- Provide frontend templates that translate these codes into actionable guidance.
- Ensure these codes flow through existing API structured logs for monitoring.

**Non-Goals:**

- Implement a true tokenizer-based budget (we will avoid introducing new heavy deps).
- Change LLM provider or prompt strategy beyond what is required for error handling.
- Add provider-backed E2E tests (unit tests + deterministic checks only).

## Decisions

1. **Budget by characters + lines (not tokens)**
   - Rationale: deterministic, fast, no new dependency, good-enough proxy for request size.
   - Alternative considered: token estimation via tokenizer lib. Rejected for added dependency/weight.

2. **Node scope context trims sibling list**
   - Node scope currently lists all siblings; this can explode for “star” shapes.
   - Decision: cap siblings displayed and include a “... and N more” marker.

3. **Fail fast for low-quality global context**
   - If meeting the char budget requires dropping below a minimum line budget, return `context_too_large` and recommend narrowing scope (node mode) or reducing depth/branching.

4. **Standardize error codes for common model failures**
   - Use snake_case codes: `context_too_large`, `model_output_truncated`, `model_output_empty`.
   - Include `hints: string[]` in error payload for UI display (frontend may also use local templates).

## Risks / Trade-offs

- [Risk] Over-aggressive trimming reduces model quality → Mitigation: keep conservative defaults and only fail fast when context would become too small to be useful.
- [Risk] Inconsistent error-code casing vs other APIs → Mitigation: scope standardization to `/api/ai/chat` common provider failure modes; keep payload backwards-compatible (still includes `message`).
- [Risk] New UI messages drift from server hints → Mitigation: keep server `hints` aligned with UX copy; frontend templates fall back to server-provided hints.

## Migration Plan

- Deploy backend changes first (new codes + hints), then frontend mapping.
- No DB migrations required.
- Rollback: revert to previous context builder and restore legacy error codes.

## Open Questions

- Do we want to persist a “context truncated” flag in successful responses for later UX/telemetry improvements? (Not required for this change.)
