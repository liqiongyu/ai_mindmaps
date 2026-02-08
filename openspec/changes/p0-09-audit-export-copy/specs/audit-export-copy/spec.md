## ADDED Requirements

### Requirement: Audit export is labeled distinctly from PNG/SVG export

The system MUST label the `audit_export` usage metric as “审计导出(JSON)” to avoid confusing it with PNG/SVG mindmap export.

#### Scenario: Usage page displays audit export label

- **WHEN** the user views the account usage summary
- **THEN** the UI displays `审计导出(JSON)` for the `audit_export` metric

#### Scenario: Pricing page displays audit export label

- **WHEN** the user views the pricing/limits page
- **THEN** the UI displays `审计导出(JSON)` consistently with the usage page

### Requirement: AI panel audit export clarifies JSON output

The system MUST clarify in the AI panel that the export action outputs an audit JSON file (not PNG/SVG).

#### Scenario: AI panel export includes JSON clarification

- **WHEN** the user sees the AI panel export control
- **THEN** the UI indicates the export is “审计导出(JSON)” (or equivalent) and not PNG/SVG export

### Requirement: Quota exceeded message uses audit export wording

When audit export quota is exceeded, the system MUST use wording that clearly refers to audit export.

#### Scenario: Audit export quota exceeded message is unambiguous

- **WHEN** the server rejects an audit export request with `code=quota_exceeded`
- **THEN** the message indicates `审计导出` (not generic `导出`)
