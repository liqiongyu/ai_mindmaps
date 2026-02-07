import type { MindmapState } from "./ops";

export const sampleMindmapState: MindmapState = {
  rootNodeId: "root",
  nodesById: {
    root: { id: "root", parentId: null, text: "MindMaps AI", notes: null, orderIndex: 0 },
    a: { id: "a", parentId: "root", text: "学习", notes: null, orderIndex: 0 },
    b: { id: "b", parentId: "root", text: "工作", notes: null, orderIndex: 1 },
    c: { id: "c", parentId: "root", text: "生活", notes: null, orderIndex: 2 },
    a1: { id: "a1", parentId: "a", text: "目标", notes: null, orderIndex: 0 },
    a2: { id: "a2", parentId: "a", text: "计划", notes: null, orderIndex: 1 },
  },
};
