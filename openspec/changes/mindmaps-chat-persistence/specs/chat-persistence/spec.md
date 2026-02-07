## ADDED Requirements

### Requirement: Chat threads are persisted per mindmap and scope

The system SHALL persist chat threads for mindmaps with a `scope` of `global` or `node`.

For `global` scope, each mindmap SHALL have at most one thread.

For `node` scope, each mindmap + node pair SHALL have at most one thread.

#### Scenario: Global thread is unique per mindmap

- **WHEN** an authenticated owner sends chat messages with `scope = "global"` for the same mindmap multiple times
- **THEN** all messages SHALL be recorded under the same persisted global thread

#### Scenario: Node thread is unique per mindmap + node

- **WHEN** an authenticated owner sends chat messages with `scope = "node"` for the same mindmap and the same selected node multiple times
- **THEN** all messages SHALL be recorded under the same persisted node-scoped thread

### Requirement: AI chat requests are recorded as user + assistant messages

After a successful AI chat request, the system SHALL persist:

- one `user` message containing the user’s input
- one `assistant` message containing the assistant’s natural-language response

For assistant messages, the system SHALL persist the validated `operations[]` (or an empty array) and the provider/model metadata used to generate the response.

#### Scenario: Successful chat persists two messages with ops

- **WHEN** an authenticated owner successfully calls `POST /api/ai/chat`
- **THEN** the system SHALL persist one `user` message and one `assistant` message in the thread

### Requirement: Chat history is retrievable by the owner

The system SHALL provide a read API to retrieve the persisted thread and message history for a given `(mindmapId, scope, selectedNodeId?)`.

The messages SHALL be returned in chronological order (oldest to newest).

Only the mindmap owner SHALL be allowed to read chat threads and messages.

#### Scenario: Owner can load chat history

- **WHEN** an authenticated owner calls `GET /api/ai/chat` for a mindmap they own
- **THEN** the system SHALL return the persisted messages for the matching thread, ordered oldest to newest

#### Scenario: Unauthenticated request is rejected

- **WHEN** a request is made without an authenticated user session
- **THEN** the system SHALL reject the request

### Requirement: Missing thread returns an empty history

If a thread does not exist yet for the requested scope, the system SHALL return an empty message list rather than an error.

#### Scenario: First-time chat history load

- **WHEN** an authenticated owner calls `GET /api/ai/chat` for a scope that has no thread yet
- **THEN** the system SHALL return an empty message list
