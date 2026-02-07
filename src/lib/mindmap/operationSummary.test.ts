import { describe, expect, test } from "vitest";

import type { Operation } from "./ops";
import {
  deriveOperationHighlights,
  hasDeleteNodeOperation,
  summarizeOperations,
} from "./operationSummary";

describe("summarizeOperations", () => {
  test("counts supported operation types", () => {
    const operations: Operation[] = [
      { type: "add_node", nodeId: "a", parentId: "root", text: "A" },
      { type: "rename_node", nodeId: "a", text: "A1" },
      { type: "move_node", nodeId: "a", newParentId: "root" },
      { type: "reorder_children", parentId: "root", orderedChildIds: ["a"] },
      { type: "delete_node", nodeId: "a" },
      { type: "update_notes", nodeId: "root", notes: "n" },
    ];

    expect(summarizeOperations(operations)).toEqual({
      add: 1,
      rename: 1,
      move: 1,
      delete: 1,
      reorder: 1,
    });
  });
});

describe("hasDeleteNodeOperation", () => {
  test("returns true when a delete_node op exists", () => {
    const operations: Operation[] = [{ type: "delete_node", nodeId: "a" }];
    expect(hasDeleteNodeOperation(operations)).toBe(true);
  });

  test("returns false when no delete_node ops exist", () => {
    const operations: Operation[] = [
      { type: "add_node", nodeId: "a", parentId: "root", text: "A" },
    ];
    expect(hasDeleteNodeOperation(operations)).toBe(false);
  });
});

describe("deriveOperationHighlights", () => {
  test("derives highlight kinds for add/rename/move", () => {
    const operations: Operation[] = [
      { type: "add_node", nodeId: "a", parentId: "root", text: "A" },
      { type: "rename_node", nodeId: "b", text: "B" },
      { type: "move_node", nodeId: "c", newParentId: "root" },
      { type: "update_notes", nodeId: "a", notes: "n" },
      { type: "reorder_children", parentId: "root", orderedChildIds: ["a", "b", "c"] },
      { type: "delete_node", nodeId: "d" },
    ];

    expect(deriveOperationHighlights(operations)).toEqual({
      a: "add",
      b: "rename",
      c: "move",
    });
  });

  test("prefers add over rename over move for the same node", () => {
    const operations: Operation[] = [
      { type: "move_node", nodeId: "a", newParentId: "root" },
      { type: "rename_node", nodeId: "a", text: "A" },
      { type: "add_node", nodeId: "a", parentId: "root", text: "A" },
    ];

    expect(deriveOperationHighlights(operations)).toEqual({ a: "add" });
  });
});
