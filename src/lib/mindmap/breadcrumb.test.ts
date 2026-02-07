import { describe, expect, test } from "vitest";

import { getMindmapNodeBreadcrumb } from "./breadcrumb";
import type { MindmapState } from "./ops";

describe("getMindmapNodeBreadcrumb", () => {
  test("returns root-to-leaf breadcrumb path", () => {
    const state: MindmapState = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "根", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "a", text: "B", notes: null, orderIndex: 0 },
      },
    };

    expect(getMindmapNodeBreadcrumb(state, "b")).toEqual([
      { id: "root", text: "根" },
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ]);
  });

  test("returns empty array for unknown nodeId", () => {
    const state: MindmapState = { rootNodeId: "root", nodesById: {} };
    expect(getMindmapNodeBreadcrumb(state, "missing")).toEqual([]);
  });

  test("stops safely when parent is missing", () => {
    const state: MindmapState = {
      rootNodeId: "root",
      nodesById: {
        a: { id: "a", parentId: "missing", text: "A", notes: null, orderIndex: 0 },
      },
    };

    expect(getMindmapNodeBreadcrumb(state, "a")).toEqual([{ id: "a", text: "A" }]);
  });

  test("stops safely on cycles", () => {
    const state: MindmapState = {
      rootNodeId: "a",
      nodesById: {
        a: { id: "a", parentId: "b", text: "A", notes: null, orderIndex: 0 },
        b: { id: "b", parentId: "a", text: "B", notes: null, orderIndex: 0 },
      },
    };

    const breadcrumb = getMindmapNodeBreadcrumb(state, "a");
    expect(breadcrumb.length).toBeGreaterThan(0);
    expect(breadcrumb.length).toBeLessThanOrEqual(2);
  });
});
