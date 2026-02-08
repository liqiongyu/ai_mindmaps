## ADDED Requirements

### Requirement: Public read is slug-controlled

Anonymous users SHALL only be able to read public mindmaps via a controlled `public_slug` path, consistent with “公开（持链接可见）” semantics.

#### Scenario: Read public snapshot by slug

- **WHEN** a client requests a public mindmap snapshot with a valid `public_slug`
- **THEN** the system returns the minimal snapshot required to render the public page

#### Scenario: Invalid slug is not readable

- **WHEN** a client requests a public mindmap snapshot with an invalid or non-public `public_slug`
- **THEN** the system returns “not found” and does not leak additional details

### Requirement: No public enumeration

Anonymous users SHALL NOT be able to enumerate a list of public mindmaps through direct table reads.

#### Scenario: Public list enumeration is blocked

- **WHEN** an anonymous client attempts to `select` from `mindmaps` or `mindmap_nodes`
- **THEN** the request is denied by RLS (or returns no rows) unless it uses the slug-controlled read path

### Requirement: Public snapshot excludes chat data

The public snapshot SHALL NOT include chat threads/messages or other non-render fields.

#### Scenario: Public response is minimal

- **WHEN** a client reads a public snapshot
- **THEN** the response does not include chat messages and only includes fields required for rendering

### Requirement: Stop sharing invalidates old link

After stopping sharing, the old public link SHALL no longer be accessible.

#### Scenario: Old slug becomes invalid after stop sharing

- **WHEN** the owner stops sharing a mindmap
- **THEN** subsequent reads using the previous `public_slug` return “not found”
