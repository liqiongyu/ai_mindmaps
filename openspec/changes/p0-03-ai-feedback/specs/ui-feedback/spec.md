## ADDED Requirements

### Requirement: UI feedback enqueue API

The client SHALL expose `uiFeedback.enqueue({ type, title, message, actions[] })` to show non-blocking feedback (toast/banner) across the app.

#### Scenario: Enqueue a toast

- **WHEN** the app calls `uiFeedback.enqueue(...)`
- **THEN** a toast is rendered with the given `type/title/message` and can be dismissed by the user

#### Scenario: Toast actions

- **WHEN** `actions[]` is provided on `enqueue`
- **THEN** each action is rendered as an interactive control and triggers its handler when clicked

### Requirement: UI feedback accessibility output

The feedback UI SHALL be announced to assistive technologies for asynchronous updates.

#### Scenario: Error feedback is announced

- **WHEN** an error feedback item is rendered
- **THEN** it is exposed with `role="alert"` (or equivalent `aria-live="assertive"`) so screen readers can announce it

#### Scenario: Non-error feedback is announced

- **WHEN** a non-error feedback item is rendered
- **THEN** it is exposed with `role="status"` (or equivalent `aria-live="polite"`) so screen readers can announce it

### Requirement: Dangerous action confirmation

The client SHALL provide `uiFeedback.confirm(...)` to replace `window.confirm` for dangerous actions, using a modal confirmation UI.

#### Scenario: User confirms

- **WHEN** the app calls `uiFeedback.confirm(...)` and the user confirms
- **THEN** the modal closes and the returned Promise resolves to `true`

#### Scenario: User cancels

- **WHEN** the app calls `uiFeedback.confirm(...)` and the user cancels (button click or backdrop)
- **THEN** the modal closes and the returned Promise resolves to `false`

#### Scenario: Escape cancels

- **WHEN** the confirmation modal is open and the user presses `Escape`
- **THEN** the modal closes and the returned Promise resolves to `false`

### Requirement: AI change summary visibility

After AI operations are applied successfully, the UI SHALL present a change summary to the user within 2 seconds.

#### Scenario: AI ops applied

- **WHEN** AI operations are applied successfully
- **THEN** the user can see a summary such as `变更摘要：新增 {n} · 改名 {n} · 移动 {n} · 删除 {n}` within 2 seconds
