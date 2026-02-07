export type MindmapEditorKeyAction =
  | "edit_title"
  | "add_child"
  | "add_sibling"
  | "delete_selected"
  | "undo"
  | "redo";

export type KeybindingInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

export function getMindmapEditorKeyAction(input: KeybindingInput): MindmapEditorKeyAction | null {
  const key = input.key;
  const mod = Boolean(input.metaKey || input.ctrlKey);

  if (mod) {
    const lower = key.toLowerCase();
    if (lower === "z" && !input.shiftKey) return "undo";
    if (lower === "y" || (lower === "z" && input.shiftKey)) return "redo";
    return null;
  }

  if (input.altKey) return null;

  if (key === "F2") return "edit_title";

  if (key === "Enter" && !input.metaKey && !input.ctrlKey && !input.altKey && !input.shiftKey) {
    return "add_child";
  }

  if (key === "Tab") return "add_sibling";

  if (key === "Backspace" || key === "Delete") {
    return "delete_selected";
  }

  return null;
}
