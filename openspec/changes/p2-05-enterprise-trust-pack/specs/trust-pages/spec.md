## ADDED Requirements

### Requirement: Trust pages are publicly accessible

The system MUST provide publicly accessible pages at `/privacy`, `/security`, and `/trust`.

#### Scenario: Pages render without authentication

- **WHEN** an unauthenticated visitor opens `/privacy`, `/security`, or `/trust`
- **THEN** the page renders successfully and provides readable trust content

### Requirement: Trust pages include core promises and user actions

The Trust pages MUST clearly state the core product promises and provide actionable guidance for data deletion and sharing controls.

#### Scenario: Trust pages mention deletion and sharing controls

- **WHEN** a visitor reads the trust content
- **THEN** the content includes statements about not training by default and the ability to delete data and stop sharing links

### Requirement: Homepage links to trust pages

The homepage MUST link to `/privacy` and `/security` from the footer (or equivalent global navigation).

#### Scenario: Footer links are clickable and correct

- **WHEN** a visitor clicks the footer links for privacy or security
- **THEN** the visitor is navigated to `/privacy` or `/security` respectively
