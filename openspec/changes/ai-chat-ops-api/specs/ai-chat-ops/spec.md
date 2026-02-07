## ADDED Requirements

### Requirement: AI chat endpoint returns ops

The system SHALL expose an authenticated endpoint for AI chat that returns a natural-language assistant message plus validated `operations[]`.

#### Scenario: Global chat request

- **WHEN** an authenticated owner sends `POST /api/ai/chat` with `scope = "global"`
- **THEN** the system SHALL return `assistant_message` and `operations[]` that are valid against the ops schema

### Requirement: Invalid model output is rejected

The system SHALL reject responses that are not valid JSON or that do not validate against the expected schema.

#### Scenario: Malformed response

- **WHEN** the model output cannot be parsed or validated
- **THEN** the system SHALL return a 4xx response and SHALL NOT apply changes

### Requirement: Node-scoped chat is restricted to subtree

For node-scoped chat, the system SHALL only allow operations that affect the selected node's subtree (and nodes newly created under it).

#### Scenario: Scope violation

- **WHEN** `scope = "node"` and the model outputs ops that reference nodes outside the selected subtree
- **THEN** the system SHALL reject the ops and return a 4xx response
