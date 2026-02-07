## ADDED Requirements

### Requirement: Editor shows share status

The editor MUST display whether the mindmap is private or public (unlisted by link).

#### Scenario: Private state

- **GIVEN** `is_public=false` or `public_slug` is null
- **THEN** the editor shows `私有（仅我可见）`

#### Scenario: Public state

- **GIVEN** `is_public=true` and `public_slug` is non-null
- **THEN** the editor shows `公开（持链接可见，只读）` and the share link

### Requirement: User can refresh link

Users MUST be able to rotate the public link so old links become invalid.

#### Scenario: Refresh share link

- **WHEN** the user clicks `刷新链接`
- **THEN** the server generates a new `public_slug` and returns the new link

### Requirement: User can stop sharing

Users MUST be able to stop sharing and invalidate the public link.

#### Scenario: Stop sharing invalidates old slug

- **WHEN** the user confirms `停止分享`
- **THEN** `is_public=false`, `public_slug=null`, and `/public/:oldSlug` returns 404

### Requirement: Public page remains read-only and excludes chat/ops

The public view MUST NOT expose chat messages or AI ops content.
