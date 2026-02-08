## ADDED Requirements

### Requirement: Server can pre-check quota without consuming

The system MUST provide a server-callable quota pre-check that returns the same quota envelope as consumption, without incrementing usage counters.

#### Scenario: Pre-check returns quota exceeded without increment

- **WHEN** the server performs a quota pre-check for a metered operation with `metric`, `period`, and `amount`
- **THEN** the response indicates `ok=false` when `used + amount` would exceed the configured limit

#### Scenario: Pre-check allows request when under limit

- **WHEN** the server performs a quota pre-check and `used + amount` is within the configured limit (or the limit is unset)
- **THEN** the response indicates `ok=true` and includes `used`, `limit`, and `resetAt`
