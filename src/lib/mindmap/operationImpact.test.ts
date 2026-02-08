import { describe, expect, test } from "vitest";

import type { MindmapState, Operation } from "./ops";
import { computeDeleteImpact } from "./operationImpact";

describe("computeDeleteImpact", () => {
  test("counts subtree nodes deleted by delete_node operations", () => {
    const state: MindmapState = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "a", text: "B", notes: null, orderIndex: 0 },
        c: { id: "c", parentId: "root", text: "C", notes: null, orderIndex: 1 },
      },
    };

    const operations: Operation[] = [{ type: "delete_node", nodeId: "a" }];
    expect(computeDeleteImpact(state, operations)).toEqual({ nodes: 2 });
  });

  test("deduplicates overlapping deletes", () => {
    const state: MindmapState = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "a", text: "B", notes: null, orderIndex: 0 },
      },
    };

    const operations: Operation[] = [
      { type: "delete_node", nodeId: "a" },
      { type: "delete_node", nodeId: "b" },
    ];
    expect(computeDeleteImpact(state, operations)).toEqual({ nodes: 2 });
  });
});
