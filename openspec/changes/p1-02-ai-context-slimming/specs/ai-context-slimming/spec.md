## ADDED Requirements

### Requirement: Slimmed context for global scope

- **WHEN** a user sends a global-scope AI request
- **THEN** the server MUST send an outline-style context instead of full nodes JSON.

### Requirement: Slimmed context for node scope

- **WHEN** a user sends a node-scope AI request
- **THEN** the server MUST send only the selected subtree + path + siblings overview.

### Requirement: Stable at large node counts

- **WHEN** a mindmap exceeds a threshold (e.g. 300 nodes)
- **THEN** the server MUST still be able to build the context and send the AI request without truncation due to oversized input.
