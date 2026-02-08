## ADDED Requirements

### Requirement: Budgeted mindmap context per scope

The server MUST construct the AI mindmap context with a bounded size so requests remain reliable for large mindmaps.

#### Scenario: Global scope context is bounded

- **WHEN** a user calls `POST /api/ai/chat` with `scope="global"`
- **THEN** the server MUST generate a global outline context that stays within the server-defined context budget (line/character budgets).

#### Scenario: Node scope context is bounded

- **WHEN** a user calls `POST /api/ai/chat` with `scope="node"`
- **THEN** the server MUST generate a node-scoped context that prioritizes the selected subtree + path, and stays within the server-defined context budget (line/character budgets).

### Requirement: Actionable error for oversized context

When the server cannot build a minimum-useful context within the context budget, it MUST return an actionable error instead of attempting a low-quality global request.

#### Scenario: Context too large for global scope

- **WHEN** a user calls `POST /api/ai/chat` and the global context cannot be built within the minimum-useful budget
- **THEN** the server MUST return `{ ok: false, code: "context_too_large" }` and include recovery hints suitable for UI display.

### Requirement: Standard error codes for common model failures

The server MUST standardize error codes for model output failures so the frontend can show consistent recovery guidance and telemetry can measure rates.

#### Scenario: Model output truncated

- **WHEN** the model response is incomplete due to output token limits
- **THEN** the server MUST return `{ ok: false, code: "model_output_truncated" }`.

#### Scenario: Model output empty

- **WHEN** the model response output is empty
- **THEN** the server MUST return `{ ok: false, code: "model_output_empty" }`.

### Requirement: Frontend displays recovery guidance for standardized codes

The frontend MUST present actionable recovery guidance for `context_too_large`, `model_output_truncated`, and `model_output_empty`.

#### Scenario: User sees actionable guidance

- **WHEN** the frontend receives an `/api/ai/chat` error response with one of the standardized codes
- **THEN** it MUST show guidance such as switching to node scope, reducing depth, or narrowing the branch before retrying.
