## ADDED Requirements

### Requirement: Supabase schema for mindmaps exists

The system SHALL provide a `mindmaps` table in Supabase Postgres to persist mindmaps.

#### Scenario: Create a mindmap row

- **WHEN** an authenticated user creates a new mindmap
- **THEN** the system SHALL create a `mindmaps` row with `owner_id` set to that user

### Requirement: Supabase schema for mindmap nodes exists

The system SHALL provide a `mindmap_nodes` table to persist the nodes of a mindmap as a tree structure.

#### Scenario: Load a mindmap tree

- **WHEN** the system queries for a mindmap and its nodes
- **THEN** it SHALL be able to reconstruct a tree using each node's `parent_id` and sibling ordering via `order_index`

### Requirement: Deleting a mindmap deletes its nodes

Deleting a mindmap SHALL delete all nodes that belong to it.

#### Scenario: Delete mindmap cascades to nodes

- **WHEN** an authenticated owner deletes a mindmap
- **THEN** all `mindmap_nodes` rows for that mindmap SHALL be deleted

### Requirement: Private mindmaps are owner-only via RLS

The database SHALL enforce row-level security such that only the owner can read and write their private mindmaps and nodes.

#### Scenario: Non-owner cannot read or write

- **WHEN** a different authenticated user attempts to read or mutate another user's private mindmap or nodes
- **THEN** the database SHALL deny access

### Requirement: Public mindmaps are readable anonymously

The database SHALL allow anonymous (unauthenticated) read access to mindmaps and nodes that are marked public.

#### Scenario: Anonymous user can read a public mindmap

- **WHEN** an anonymous user queries a mindmap with `is_public = true`
- **THEN** the database SHALL allow `SELECT` access to that mindmap and its nodes
