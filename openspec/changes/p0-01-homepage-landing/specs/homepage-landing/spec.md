## ADDED Requirements

### Requirement: Product landing page at `/`

The system SHALL render a product marketing landing page at `/` that communicates MMA’s core positioning in zh-CN.

#### Scenario: First-time visitor lands on home page

- **WHEN** an unauthenticated user visits `/`
- **THEN** the page shows a hero section with a clear title, supporting description, and key benefit bullets in zh-CN

### Requirement: Primary CTA routes to `/try`

The landing page MUST contain a prominent primary CTA in the hero section labeled `立即体验（免登录）` that routes users to `/try`.

#### Scenario: User clicks the primary CTA

- **WHEN** the user clicks `立即体验（免登录）`
- **THEN** the browser navigates to `/try`

### Requirement: Minimal top navigation

The landing page SHALL include a minimal top navigation bar with:

- Brand/Logo text
- Primary CTA to `/try`
- Secondary actions to `/login` and `/signup`

#### Scenario: User inspects top navigation

- **WHEN** the user views the header area of `/`
- **THEN** they can access links to `/try`, `/login`, and `/signup`

### Requirement: Quick start, FAQ, and privacy statement

The landing page SHALL include:

- A “30 秒上手” section describing 3 steps
- An FAQ section that is collapsible/accordion style
- A lightweight privacy statement aligned with the product messaging

#### Scenario: User scans supporting sections

- **WHEN** the user scrolls below the hero section
- **THEN** they can find the quick start steps, expand/collapse FAQs, and read the privacy statement
