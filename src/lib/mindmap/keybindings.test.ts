import { describe, expect, test } from "vitest";

import { getMindmapEditorKeyAction } from "./keybindings";

describe("getMindmapEditorKeyAction", () => {
  test("maps undo/redo shortcuts", () => {
    expect(getMindmapEditorKeyAction({ key: "z", metaKey: true })).toBe("undo");
    expect(getMindmapEditorKeyAction({ key: "z", ctrlKey: true })).toBe("undo");
    expect(getMindmapEditorKeyAction({ key: "z", metaKey: true, shiftKey: true })).toBe("redo");
    expect(getMindmapEditorKeyAction({ key: "y", ctrlKey: true })).toBe("redo");
  });

  test("maps F2 to edit title", () => {
    expect(getMindmapEditorKeyAction({ key: "F2" })).toBe("edit_title");
  });

  test("maps Enter to add child (no modifiers)", () => {
    expect(getMindmapEditorKeyAction({ key: "Enter" })).toBe("add_child");
    expect(getMindmapEditorKeyAction({ key: "Enter", shiftKey: true })).toBeNull();
  });

  test("maps Tab to add sibling", () => {
    expect(getMindmapEditorKeyAction({ key: "Tab" })).toBe("add_sibling");
    expect(getMindmapEditorKeyAction({ key: "Tab", shiftKey: true })).toBeNull();
  });

  test("maps Delete/Backspace to delete selected", () => {
    expect(getMindmapEditorKeyAction({ key: "Backspace" })).toBe("delete_selected");
    expect(getMindmapEditorKeyAction({ key: "Delete" })).toBe("delete_selected");
  });

  test("returns null for unrelated keys", () => {
    expect(getMindmapEditorKeyAction({ key: "a" })).toBeNull();
    expect(getMindmapEditorKeyAction({ key: "Enter", metaKey: true })).toBeNull();
    expect(getMindmapEditorKeyAction({ key: "Tab", altKey: true })).toBeNull();
  });
});
