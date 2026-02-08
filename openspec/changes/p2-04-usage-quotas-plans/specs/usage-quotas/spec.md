## ADDED Requirements

### Requirement: Plan limits are configurable

The system MUST store plan limits in `plan_limits` and make them readable for authenticated users.

#### Scenario: Authenticated user can read plan limits

- **WHEN** an authenticated user requests plan limits (directly or via a derived summary)
- **THEN** the system returns the configured limits for the user’s current plan

### Requirement: Usage is tracked per metric and period

The system MUST track usage in `usage_counters` for metered operations using a defined `metric` and `period`.

#### Scenario: Successful AI request consumes quota

- **WHEN** a user successfully performs a metered AI request
- **THEN** the `usage_counters` value for `metric=ai_chat` and the current `period` is incremented by 1

### Requirement: Server enforces quotas on metered operations

The system MUST enforce plan limits server-side for metered operations, including concurrent requests.

#### Scenario: Over-quota request is rejected

- **WHEN** the user’s current usage is at or above the configured limit for a metered operation
- **THEN** the server rejects the request with HTTP `429` and `code=quota_exceeded`

### Requirement: Over-quota responses provide recovery and upgrade path

When rejecting requests due to quota, the system MUST provide a clear upgrade path and reset information.

#### Scenario: Quota exceeded response includes upgrade URL and reset time

- **WHEN** the server rejects a request with `code=quota_exceeded`
- **THEN** the response includes `metric`, `used`, `limit`, `resetAt`, and `upgradeUrl`

### Requirement: Users can view core usage indicators

The system MUST allow users to view core usage indicators for AI requests, exports, and public shares.

#### Scenario: Usage panel displays used and limit

- **WHEN** the user opens the usage UI
- **THEN** the UI displays `used/limit` for AI requests, exports, and public shares, and provides an upgrade entry point
