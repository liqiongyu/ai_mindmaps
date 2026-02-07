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
});
