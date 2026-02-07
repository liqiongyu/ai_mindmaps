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

  test("rename_node updates node text", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
      },
    };

    const next = applyOperations(state, [{ type: "rename_node", nodeId: "a", text: "Renamed" }]);
    expect(next.nodesById.a.text).toBe("Renamed");
  });

  test("delete_node removes subtree and normalizes orderIndex", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "root", text: "B", notes: null, orderIndex: 1 },
        c: { id: "c", parentId: "root", text: "C", notes: null, orderIndex: 2 },
        b1: { id: "b1", parentId: "b", text: "B1", notes: null, orderIndex: 0 },
      },
    };

    const next = applyOperations(state, [{ type: "delete_node", nodeId: "b" }]);

    expect(next.nodesById.b).toBeUndefined();
    expect(next.nodesById.b1).toBeUndefined();

    const children = Object.values(next.nodesById)
      .filter((n) => n.parentId === "root")
      .sort((x, y) => x.orderIndex - y.orderIndex);

    expect(children.map((n) => n.id)).toEqual(["a", "c"]);
    expect(children.map((n) => n.orderIndex)).toEqual([0, 1]);
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

  test("reorder_children updates sibling orderIndex", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "root", text: "B", notes: null, orderIndex: 1 },
        c: { id: "c", parentId: "root", text: "C", notes: null, orderIndex: 2 },
      },
    };

    const next = applyOperations(state, [
      { type: "reorder_children", parentId: "root", orderedChildIds: ["c", "a", "b"] },
    ]);

    const children = Object.values(next.nodesById)
      .filter((n) => n.parentId === "root")
      .sort((x, y) => x.orderIndex - y.orderIndex);

    expect(children.map((n) => n.id)).toEqual(["c", "a", "b"]);
    expect(children.map((n) => n.orderIndex)).toEqual([0, 1, 2]);
  });

  test("reorder_children requires including all current children", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "root", text: "B", notes: null, orderIndex: 1 },
      },
    };

    expect(() =>
      applyOperations(state, [
        { type: "reorder_children", parentId: "root", orderedChildIds: ["a"] },
      ]),
    ).toThrow(/must include all current children/i);
  });
});
