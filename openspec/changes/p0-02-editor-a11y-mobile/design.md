## Mobile AI Drawer

- The AI panel becomes a bottom drawer on `<lg`.
- Trigger is a top-level `AI` button in the editor header.
- Drawer behavior:
  - Backdrop click closes
  - `Esc` closes
  - Keeps chat state while opening/closing within the session

## Keyboard access for nodes

- Each node is focusable (`tabIndex={0}`) and announces as a button (`role="button"`).
- On focus, the node becomes the selected node (so existing global shortcuts apply):
  - `F2` edits selected node
  - `Enter` adds child
  - `Tab` adds sibling

## Global accessibility affordances

- Skip link (`跳转到主内容`) is the first focusable element and targets a stable container id.
- A consistent `:focus-visible` style is applied to buttons/links/inputs and focusable node elements.

## Notes / constraints

- React Flow already enables node focus (`nodesFocusable`); we add an explicit focusable element and focus→select binding to make behavior reliable.
