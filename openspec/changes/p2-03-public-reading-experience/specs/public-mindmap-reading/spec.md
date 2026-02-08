## ADDED Requirements

### Requirement: Public page renders node notes as safe Markdown

The system MUST render public node notes using a Markdown renderer that prevents XSS (no raw HTML execution and no unsafe attributes/URLs).

#### Scenario: Render Markdown notes

- **WHEN** a user opens `/public/:slug` and selects a node with Markdown notes
- **THEN** the notes MUST be rendered with Markdown formatting (e.g. lists, links, code)

#### Scenario: Sanitize unsafe content

- **WHEN** a node note contains unsafe HTML/script content
- **THEN** the public page MUST NOT execute scripts or render unsafe HTML/attributes

### Requirement: Public page supports node deep links

The system MUST support linking directly to a specific public node via query string, selecting and highlighting it on load.

#### Scenario: Deep link to an existing node

- **WHEN** a user opens `/public/:slug?node=<nodeId>` and `<nodeId>` exists in the mindmap
- **THEN** the page MUST select and highlight that node
- **AND** the notes panel MUST show that node’s notes and breadcrumb path

#### Scenario: Deep link to a missing node

- **WHEN** a user opens `/public/:slug?node=<nodeId>` and `<nodeId>` does not exist in the mindmap
- **THEN** the page MUST fall back to a safe default selection (e.g. root node)

### Requirement: Public page can copy the selected node link

The system MUST allow users to copy a link that deep-links to the currently selected node.

#### Scenario: Copy current node link

- **WHEN** a user selects a node on `/public/:slug` and clicks “复制当前节点链接”
- **THEN** the system MUST copy a URL containing `?node=<selectedNodeId>` to the clipboard

### Requirement: Public page exposes OG preview metadata

The system MUST provide Open Graph metadata so that sharing `/public/:slug` produces a recognizable preview card.

#### Scenario: OG image is available

- **WHEN** a crawler requests `/public/:slug`
- **THEN** the page metadata MUST include an `og:image` URL that resolves to an image response

### Requirement: Public snapshot API supports optional nodeId focus

The system MUST allow callers to request a focused-node view via query params.

#### Scenario: API returns focusedNode when nodeId exists

- **WHEN** a caller requests `GET /api/public/:slug?nodeId=<nodeId>` and the node exists
- **THEN** the API MUST respond with `200` and `{ ok: true }`
- **AND** the response MUST include `focusedNode` with `id`, `text`, `notes`, and `breadcrumb`

#### Scenario: API ignores missing nodeId

- **WHEN** a caller requests `GET /api/public/:slug?nodeId=<nodeId>` and the node does not exist
- **THEN** the API MUST respond with `200` and `{ ok: true }` without failing the request
