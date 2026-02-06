import { describe, expect, test } from "vitest";

import { applyOperations, Operation } from "./ops";

describe("applyOperations", () => {
  test("add_node inserts with orderIndex", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
      },
    };

    const ops: Operation[] = [
      { type: "add_node", nodeId: "a", parentId: "root", text: "A" },
      { type: "add_node", nodeId: "b", parentId: "root", text: "B" },
      { type: "add_node", nodeId: "c", parentId: "root", text: "C", index: 1 },
    ];

    const next = applyOperations(state, ops);
    const children = Object.values(next.nodesById)
      .filter((n) => n.parentId === "root")
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((n) => n.id);

    expect(children).toEqual(["a", "c", "b"]);
  });

  test("move_node rejects moving into descendant", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "a", text: "B", notes: null, orderIndex: 0 },
      },
    };

    expect(() =>
      applyOperations(state, [{ type: "move_node", nodeId: "a", newParentId: "b" }]),
    ).toThrow(/descendant/);
  });
});
