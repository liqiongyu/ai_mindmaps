## Problem

After AI operations are applied, users currently lack immediate feedback about what changed (and whether it included risky actions like delete). This reduces trust and makes it hard to verify AI behavior.

## Goals (P0)

- Show a change summary (add/rename/move/delete) immediately after ops apply.
- Highlight affected nodes (add/rename/move) for a short duration (3–5s).
- Default safety mode: AI MUST NOT delete nodes (`delete_node` is rejected).

## Non-goals (P0)

- A full audit/log viewer (P1-03).
- A user-toggleable “allow delete” switch (P1+).

## Approach

1. Add an ops summarizer helper (`summarizeOperations`) and use it to render a summary UI under assistant messages.
2. Derive a highlight set from the applied operations and pass it to the canvas node renderer.
3. Enforce “no delete_node” at both prompt level and server-side validation.

## Acceptance criteria

- Users can see “what changed/how much” within ~2 seconds after AI applies ops.
- Delete is blocked by default with a clear user-facing error message.
- Node scope out-of-bounds operations are rejected server-side (already in place) and do not pollute state.
