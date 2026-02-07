## ADDED Requirements

### Requirement: Prompt chips reduce input burden

- **WHEN** a user clicks a chip above the chat input
- **THEN** the chip template is inserted into the input (fill or append).

### Requirement: Constraints influence prompting

- **WHEN** a user submits a message with constraints set
- **THEN** the server includes the constraints in the model instructions and rejects operations that violate `allowMove/allowDelete`.

### Requirement: Constraints visible in summary

- **WHEN** the assistant replies
- **THEN** the UI shows a constraints summary near the assistant message.
