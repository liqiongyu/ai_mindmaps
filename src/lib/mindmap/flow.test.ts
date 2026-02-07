import { describe, expect, test } from "vitest";

import { mindmapStateToFlow } from "./flow";

describe("mindmapStateToFlow", () => {
  test("excludes descendants of collapsed nodes", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "root", text: "B", notes: null, orderIndex: 1 },
        a1: { id: "a1", parentId: "a", text: "A1", notes: null, orderIndex: 0 },
        a2: { id: "a2", parentId: "a", text: "A2", notes: null, orderIndex: 1 },
        b1: { id: "b1", parentId: "b", text: "B1", notes: null, orderIndex: 0 },
      },
    };

    const graph = mindmapStateToFlow(state, { collapsedNodeIds: new Set(["a"]) });

    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "b1", "root"].sort());
    expect(graph.edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual(
      ["root->a", "root->b", "b->b1"].sort(),
    );
  });

  test("positions root children on both left and right sides", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "root", text: "B", notes: null, orderIndex: 1 },
        a1: { id: "a1", parentId: "a", text: "A1", notes: null, orderIndex: 0 },
        b1: { id: "b1", parentId: "b", text: "B1", notes: null, orderIndex: 0 },
      },
    };

    const graph = mindmapStateToFlow(state);
    const xById = new Map(graph.nodes.map((n) => [n.id, n.position.x] as const));

    const rootX = xById.get("root");
    const aX = xById.get("a");
    const bX = xById.get("b");
    const a1X = xById.get("a1");
    const b1X = xById.get("b1");

    expect(rootX).toBeTypeOf("number");
    expect(aX).toBeTypeOf("number");
    expect(bX).toBeTypeOf("number");
    expect(a1X).toBeTypeOf("number");
    expect(b1X).toBeTypeOf("number");

    const aSign = Math.sign(aX! - rootX!);
    const bSign = Math.sign(bX! - rootX!);
    expect(aSign).not.toBe(0);
    expect(bSign).not.toBe(0);
    expect(aSign).toBe(-bSign);

    expect(Math.sign(a1X! - rootX!)).toBe(aSign);
    expect(Math.sign(b1X! - rootX!)).toBe(bSign);
  });

  test("uses persisted positions when present", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: {
          id: "root",
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
          posX: 123,
          posY: 456,
        },
        a: {
          id: "a",
          parentId: "root",
          text: "A",
          notes: null,
          orderIndex: 0,
          posX: 10,
          posY: 20,
        },
      },
    };

    const graph = mindmapStateToFlow(state);
    const posById = new Map(graph.nodes.map((n) => [n.id, n.position] as const));

    expect(posById.get("root")).toEqual({ x: 123, y: 456 });
    expect(posById.get("a")).toEqual({ x: 10, y: 20 });
  });

  test("uses persisted positions when present", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: {
          id: "root",
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
          posX: 123,
          posY: 456,
        },
        a: {
          id: "a",
          parentId: "root",
          text: "A",
          notes: null,
          orderIndex: 0,
          posX: 10,
          posY: 20,
        },
      },
    };

    const graph = mindmapStateToFlow(state);
    const posById = new Map(graph.nodes.map((n) => [n.id, n.position] as const));

    expect(posById.get("root")).toEqual({ x: 123, y: 456 });
    expect(posById.get("a")).toEqual({ x: 10, y: 20 });
  });
});
