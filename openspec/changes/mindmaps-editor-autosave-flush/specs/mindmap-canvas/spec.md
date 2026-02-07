## ADDED Requirements

### Requirement: Persisted editor flushes pending autosaves on leave

When editing a persisted mindmap, the editor SHALL attempt a best-effort save of the most recent state when the user leaves the page and there are unsaved changes.

#### Scenario: Leave page with pending changes triggers a save

- **WHEN** the user has unsaved changes in a persisted mindmap and the editor is being hidden/unmounted (e.g. navigation away, tab close, refresh)
- **THEN** the editor SHALL attempt to send an immediate save request with the latest state

#### Scenario: Leave page with no pending changes does nothing

- **WHEN** the user leaves the page and there are no unsaved changes
- **THEN** the editor SHALL not send an extra save request
