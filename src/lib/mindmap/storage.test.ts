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
    const rootNodeId = "00000000-0000-4000-8000-0000000000ff";
    const result = MindmapStateSchema.safeParse({
      rootNodeId,
      nodesById: {},
    });
    expect(result.success).toBe(false);
  });

  test("MindmapStateSchema rejects root node with non-null parentId", () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000011";
    const parentId = "00000000-0000-4000-8000-000000000012";
    const state = {
      rootNodeId,
      nodesById: {
        [rootNodeId]: { id: rootNodeId, parentId, text: "Root", notes: null, orderIndex: 0 },
      },
    };

    const result = MindmapStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  test("MindmapStateSchema rejects non-root node with null parentId", () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000021";
    const otherId = "00000000-0000-4000-8000-000000000022";
    const result = MindmapStateSchema.safeParse({
      rootNodeId,
      nodesById: {
        [rootNodeId]: { id: rootNodeId, parentId: null, text: "Root", notes: null, orderIndex: 0 },
        [otherId]: { id: otherId, parentId: null, text: "Other", notes: null, orderIndex: 0 },
      },
    });
    expect(result.success).toBe(false);
  });

  test("MindmapStateSchema rejects node with missing parentId reference", () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000031";
    const childId = "00000000-0000-4000-8000-000000000032";
    const missingParentId = "00000000-0000-4000-8000-000000000033";
    const result = MindmapStateSchema.safeParse({
      rootNodeId,
      nodesById: {
        [rootNodeId]: { id: rootNodeId, parentId: null, text: "Root", notes: null, orderIndex: 0 },
        [childId]: {
          id: childId,
          parentId: missingParentId,
          text: "Child",
          notes: null,
          orderIndex: 0,
        },
      },
    });
    expect(result.success).toBe(false);
  });

  test("nodeRowsToMindmapState maps persisted positions", () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000041";
    const restored = nodeRowsToMindmapState(rootNodeId, [
      {
        id: rootNodeId,
        parent_id: null,
        text: "Root",
        notes: null,
        order_index: 0,
        pos_x: 12.5,
        pos_y: 34.25,
      },
    ]);

    expect(restored.nodesById[rootNodeId].posX).toBe(12.5);
    expect(restored.nodesById[rootNodeId].posY).toBe(34.25);
  });
});
