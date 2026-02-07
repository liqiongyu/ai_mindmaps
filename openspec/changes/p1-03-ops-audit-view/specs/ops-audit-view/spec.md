## ADDED Requirements

### Requirement: Assistant ops are inspectable

- **WHEN** a user views an assistant message
- **THEN** they can expand an audit view to see the ops JSON and copy it.

### Requirement: Provider/model visible

- **WHEN** a user views an assistant message
- **THEN** provider/model is displayed (when available).

### Requirement: Rollback to before AI message

- **WHEN** a user clicks “回滚到此条 AI 前”
- **THEN** the editor history rewinds to the state before that assistant ops were applied, keeping undo/redo semantics consistent.
