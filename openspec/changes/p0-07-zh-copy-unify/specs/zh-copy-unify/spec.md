## ADDED Requirements

### Requirement: Core pages use zh-CN copy consistently

The app MUST use consistent zh-CN copy on the core pages listed in P0-07.

#### Scenario: No mixed-language toolbar

- **WHEN** a user visits the editor
- **THEN** toolbar labels and share/export UI are in zh-CN and match the copy dictionary

#### Scenario: Auth pages are zh-CN

- **WHEN** a user visits `/login` or `/signup`
- **THEN** titles, subtitles, and buttons are in zh-CN per the dictionary
