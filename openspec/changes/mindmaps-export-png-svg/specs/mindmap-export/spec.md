## ADDED Requirements

### Requirement: Editor supports exporting PNG

The mindmap editor SHALL allow users to export the current mindmap view as a PNG file.

#### Scenario: Export PNG downloads a file

- **WHEN** the user triggers “Export PNG” in the editor
- **THEN** the browser SHALL download a non-empty `.png` file

### Requirement: Editor supports exporting SVG

The mindmap editor SHALL allow users to export the current mindmap view as an SVG file.

#### Scenario: Export SVG downloads a file

- **WHEN** the user triggers “Export SVG” in the editor
- **THEN** the browser SHALL download a non-empty `.svg` file

### Requirement: Export uses the current mindmap state

Exports SHALL be generated from the mindmap canvas as currently rendered in the editor.

#### Scenario: Export reflects current rendering

- **WHEN** the user changes the mindmap and then exports PNG or SVG
- **THEN** the export output SHALL reflect the current canvas rendering
