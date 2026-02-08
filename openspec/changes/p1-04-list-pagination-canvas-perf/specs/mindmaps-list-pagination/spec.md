## ADDED Requirements

### Requirement: Paginated mindmap listing API

The system MUST provide a paginated API for listing a user’s mindmaps.

#### Scenario: List first page

- **WHEN** an authenticated user calls `GET /api/mindmaps?limit=<n>`
- **THEN** the server MUST return `{ ok: true, items, nextCursor, total }` where `items.length <= n`.

#### Scenario: List subsequent pages via cursor

- **WHEN** an authenticated user calls `GET /api/mindmaps?cursor=<cursor>&limit=<n>`
- **THEN** the server MUST return the next page of items after the cursor (stable order), and MUST return `nextCursor=null` when no further items exist.

### Requirement: List supports search by title

The listing API MUST support a query string to filter mindmaps by title.

#### Scenario: Search by q

- **WHEN** an authenticated user calls `GET /api/mindmaps?q=<query>`
- **THEN** the server MUST return only items whose title matches the query and MUST set `total` to the number of matching items.

### Requirement: List is owner-scoped

The listing API MUST only return mindmaps owned by the authenticated user.

#### Scenario: Non-owner cannot see other users’ mindmaps

- **WHEN** an authenticated user calls `GET /api/mindmaps`
- **THEN** the server MUST return only mindmaps with `owner_id = auth.uid()`.

### Requirement: List UI supports pagination and search

The mindmaps list UI MUST allow searching and loading additional pages.

#### Scenario: User loads more

- **WHEN** the user clicks “加载更多”
- **THEN** the UI MUST request the next page using `nextCursor` and append results.

#### Scenario: User searches and sees empty state

- **WHEN** the user searches and there are no matches
- **THEN** the UI MUST display: `未找到匹配导图，试试其他关键词。`
