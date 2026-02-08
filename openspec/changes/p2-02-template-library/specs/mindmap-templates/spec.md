## ADDED Requirements

### Requirement: Templates are listable for authenticated users

The system MUST provide a templates catalog that authenticated users can browse when creating a new mindmap.

#### Scenario: Authenticated user lists templates

- **WHEN** an authenticated user calls `GET /api/templates`
- **THEN** the API MUST respond with `200`
- **AND** the response MUST include `{ ok: true, items }`
- **AND** each item MUST include `id`, `slug`, and `title`

#### Scenario: Unauthorized user cannot list templates

- **WHEN** a user without a valid session calls `GET /api/templates`
- **THEN** the API MUST respond with `401`

### Requirement: Mindmaps can be created from a template

The system MUST support creating a new mindmap from a selected template without requiring the client to upload the full template state.

#### Scenario: Create mindmap from template id

- **WHEN** an authenticated user calls `POST /api/mindmaps` with `{ templateId }`
- **THEN** the API MUST create a new mindmap owned by the user
- **AND** the new mindmap MUST have nodes initialized from the template
- **AND** the API MUST respond with `201` and `{ ok: true, mindmapId }`

#### Scenario: Reject create from unknown template id

- **WHEN** an authenticated user calls `POST /api/mindmaps` with `{ templateId }` that does not exist
- **THEN** the API MUST respond with `404`

### Requirement: Create flow exposes template option

The system MUST provide a create flow that exposes entry points for creating from a template.

#### Scenario: User can navigate to template selection

- **WHEN** an authenticated user opens the create flow page
- **THEN** the UI MUST offer a “从模板创建” entry point
- **AND** selecting a template MUST create a new mindmap and navigate to the editor
