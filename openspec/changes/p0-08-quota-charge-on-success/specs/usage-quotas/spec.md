## ADDED Requirements

### Requirement: Metered operations only consume quota on success

The system MUST increment `usage_counters.used` only when the metered operation completes successfully (HTTP 200 and `ok:true`). Failures MUST NOT consume quota.

#### Scenario: Successful AI request consumes quota

- **WHEN** a user completes a metered AI request successfully
- **THEN** the `usage_counters` value for `metric=ai_chat` and the current `period` is incremented by 1

#### Scenario: Provider error does not consume quota

- **WHEN** a metered AI request fails due to provider errors or invalid model output
- **THEN** `usage_counters.used` is NOT incremented

### Requirement: Over-quota requests are rejected before external calls

The system MUST reject over-quota requests before triggering external provider calls.

#### Scenario: Over-quota request is rejected before provider call

- **WHEN** the user’s current usage is at or above the configured limit for `metric=ai_chat`
- **THEN** the server rejects the request with HTTP `429` and `code=quota_exceeded` without calling the external provider
