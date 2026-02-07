import { describe, expect, test } from "vitest";

import { sampleMindmapState } from "./sample";
import { MindmapStateSchema, mindmapStateToNodeRows, nodeRowsToMindmapState } from "./storage";

describe("mindmap storage", () => {
  test("round-trips MindmapState to rows and back", () => {
    const rows = mindmapStateToNodeRows("mindmap_1", sampleMindmapState);
    const picked = rows.map((r) => ({
      id: r.id,
      parent_id: r.parent_id,
      text: r.text,
      notes: r.notes,
      order_index: r.order_index,
    }));

    const restored = nodeRowsToMindmapState(sampleMindmapState.rootNodeId, picked);
    expect(restored).toEqual(sampleMindmapState);
  });

  test("MindmapStateSchema rejects missing root node", () => {
    const result = MindmapStateSchema.safeParse({
      rootNodeId: "missing",
      nodesById: {},
    });
    expect(result.success).toBe(false);
  });

  test("MindmapStateSchema rejects root node with non-null parentId", () => {
    const state = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: "x", text: "Root", notes: null, orderIndex: 0 },
      },
    };

    const result = MindmapStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });
});
