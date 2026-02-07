## Context

- Ops schema and `applyOperations()` are implemented in `src/lib/mindmap/ops.ts`.
- Azure OpenAI is available via the OpenAI-compatible SDK (`openai` package) and validated by `pnpm -s test:e2e`.
- `/api/ai/chat` currently returns a 501 placeholder.

## Goals / Non-Goals

**Goals:**

- Implement a server-side AI endpoint that returns strict JSON: `{ assistant_message, operations[] }`.
- Validate model output with Zod and apply scope rules before returning ops to the client.
- Keep API keys on the server only.

**Non-Goals:**

- Persist chat threads/messages to the database (future change).
- Build the editor chat UI (separate change).

## Decisions

- **Model API:** use `client.responses.create()` via the Azure OpenAI client.
- **Output format:** instruct the model to output JSON only; parse by extracting the first JSON object and validating with Zod.
- **Validation layers:** (1) JSON parse, (2) schema validation (`OperationSchema[]`), (3) scope validation, (4) dry-run apply via `applyOperations()` to catch logical violations (e.g., delete root).
- **Scope enforcement:** for `scope="node"`, compute the selected subtree IDs from the current state and only allow ops that reference allowed IDs, plus node IDs created by `add_node` within the batch.

## Risks / Trade-offs

- **Model non-compliance:** models sometimes include prose/code fences; mitigated by strict instructions + JSON extraction + hard validation.
- **Token limits:** large mindmaps could exceed context; mitigated in MVP by sending compact JSON and revisiting with summarization later.
