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

  test("mindmapStateToNodeRows emits parent rows before child rows", () => {
    const rows = mindmapStateToNodeRows("mindmap_1", sampleMindmapState);
    const indexById = new Map(rows.map((row, index) => [row.id, index]));

    for (const row of rows) {
      if (!row.parent_id) continue;
      const parentIndex = indexById.get(row.parent_id);
      const childIndex = indexById.get(row.id);
      if (parentIndex === undefined || childIndex === undefined) {
        throw new Error("Missing index for parent or child id");
      }
      expect(parentIndex).toBeLessThan(childIndex);
    }
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

  test("MindmapStateSchema rejects non-root node with null parentId", () => {
    const result = MindmapStateSchema.safeParse({
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        other: { id: "other", parentId: null, text: "Other", notes: null, orderIndex: 0 },
      },
    });
    expect(result.success).toBe(false);
  });

  test("MindmapStateSchema rejects node with missing parentId reference", () => {
    const result = MindmapStateSchema.safeParse({
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        child: { id: "child", parentId: "missing", text: "Child", notes: null, orderIndex: 0 },
      },
    });
    expect(result.success).toBe(false);
  });

  test("nodeRowsToMindmapState maps persisted positions", () => {
    const restored = nodeRowsToMindmapState("root", [
      {
        id: "root",
        parent_id: null,
        text: "Root",
        notes: null,
        order_index: 0,
        pos_x: 12.5,
        pos_y: 34.25,
      },
    ]);

    expect(restored.nodesById.root.posX).toBe(12.5);
    expect(restored.nodesById.root.posY).toBe(34.25);
  });
});
