## ADDED Requirements

### Requirement: Unauthenticated try-mode route

The system SHALL provide a `GET /try` route that is accessible without authentication and renders an editable mindmap canvas.

#### Scenario: Visitor opens try mode without login

- **WHEN** an unauthenticated user visits `/try`
- **THEN** the editor loads and the user can edit the mindmap without being redirected to `/login`

### Requirement: Local draft persistence in `localStorage`

The try-mode editor MUST auto-save the current draft to `localStorage` using key `mma:try:draft:v1` with the following shape:

- `state: MindmapState`
- `updatedAt: string (ISO)`
- `ui: { collapsedNodeIds: string[]; selectedNodeId: string | null }`

#### Scenario: Refresh does not lose draft

- **WHEN** the user edits the mindmap in `/try` and refreshes the page
- **THEN** the editor loads the most recently saved draft from `localStorage`

### Requirement: Clear upgrade guidance

The try-mode editor SHALL display a non-intrusive banner that explains the boundary and offers navigation to login/signup to unlock AI and cloud saving.

#### Scenario: User sees login/signup guidance

- **WHEN** the user is in `/try`
- **THEN** they can find a banner with actions to navigate to `/login` and `/signup`

### Requirement: AI and sharing are disabled in try mode (P0)

The try-mode editor MUST NOT expose AI chat controls or sharing controls.

#### Scenario: User cannot access AI/share from try mode

- **WHEN** the user is using `/try`
- **THEN** the UI does not provide controls for AI chat or generating share links
