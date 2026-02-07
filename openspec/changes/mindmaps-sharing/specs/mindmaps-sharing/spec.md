## ADDED Requirements

### Requirement: Users can generate a public share link

The system SHALL allow an authenticated owner to generate (or refresh) a public share link for a mindmap.

#### Scenario: Share from editor

- **WHEN** the owner clicks “Share” in the editor
- **THEN** the system SHALL call `POST /api/mindmaps/:id/share` and return a `publicSlug`

### Requirement: Public mindmaps are viewable without authentication

The system SHALL provide a read-only page for viewing a public mindmap by slug.

#### Scenario: View public mindmap

- **WHEN** a user visits `/public/:slug` for a mindmap with `is_public = true`
- **THEN** the system SHALL render the mindmap without requiring login

### Requirement: Invalid share links return not found

The system SHALL return a not-found experience for invalid or non-public slugs.

#### Scenario: Slug does not exist or is not public

- **WHEN** a user visits `/public/:slug` and no public mindmap matches
- **THEN** the system SHALL return a 404 / not-found page
