## ADDED Requirements

### Requirement: User can sign up with email and password

The application SHALL allow a user to create an account using email and password via Supabase Auth.

#### Scenario: Successful sign up

- **WHEN** a user submits a valid email and password on `/signup`
- **THEN** the system SHALL create the account and establish an authenticated session

### Requirement: User can sign in with email and password

The application SHALL allow a user to sign in using email and password via Supabase Auth.

#### Scenario: Successful sign in

- **WHEN** a user submits a valid email and password on `/login`
- **THEN** the system SHALL establish an authenticated session

### Requirement: Protected routes require authentication

Protected routes SHALL require an authenticated session and redirect unauthenticated users to `/login`.

#### Scenario: Unauthenticated access

- **WHEN** an unauthenticated user navigates to `/mindmaps`
- **THEN** the system SHALL redirect the user to `/login`
