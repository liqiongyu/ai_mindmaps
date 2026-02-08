import { z } from "zod";

import type { MindmapNode, MindmapState } from "./ops";

export const MindmapNodeSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  text: z.string().min(1),
  notes: z.string().nullable(),
  orderIndex: z.number().int().nonnegative(),
  posX: z.number().finite().optional(),
  posY: z.number().finite().optional(),
});

export const MindmapStateSchema = z
  .object({
    rootNodeId: z.string().uuid(),
    nodesById: z.record(z.string().uuid(), MindmapNodeSchema),
  })
  .superRefine((value, ctx) => {
    const root = value.nodesById[value.rootNodeId];
    if (!root) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rootNodeId must exist in nodesById",
        path: ["rootNodeId"],
      });
      return;
    }
    if (root.id !== value.rootNodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rootNodeId must match root node id",
        path: ["nodesById", value.rootNodeId, "id"],
      });
      return;
    }
    if (root.parentId !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Root node parentId must be null",
        path: ["nodesById", value.rootNodeId, "parentId"],
      });
    }

    for (const [nodeId, node] of Object.entries(value.nodesById)) {
      if (nodeId !== node.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "nodesById key must match node id",
          path: ["nodesById", nodeId, "id"],
        });
      }
      if (nodeId === value.rootNodeId) continue;
      if (node.parentId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only the root node may have parentId = null",
          path: ["nodesById", nodeId, "parentId"],
        });
        continue;
      }

      if (!value.nodesById[node.parentId]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "parentId must exist in nodesById",
          path: ["nodesById", nodeId, "parentId"],
        });
      }
    }
  });

export type MindmapNodeRow = {
  id: string;
  mindmap_id: string;
  parent_id: string | null;
  text: string;
  notes: string | null;
  order_index: number;
  pos_x?: number | null;
  pos_y?: number | null;
};

export function mindmapStateToNodeRows(mindmapId: string, state: MindmapState): MindmapNodeRow[] {
  const childrenByParentId: Record<string, MindmapNode[]> = {};
  for (const node of Object.values(state.nodesById)) {
    if (!node.parentId) continue;
    (childrenByParentId[node.parentId] ||= []).push(node);
  }

  for (const children of Object.values(childrenByParentId)) {
    children.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const result: MindmapNodeRow[] = [];

  const visit = (nodeId: string) => {
    const node = state.nodesById[nodeId];
    if (!node) return;
    result.push({
      id: node.id,
      mindmap_id: mindmapId,
      parent_id: node.parentId,
      text: node.text,
      notes: node.notes,
      order_index: node.orderIndex,
    });

    for (const child of childrenByParentId[nodeId] ?? []) {
      visit(child.id);
    }
  };

  visit(state.rootNodeId);
  return result;
}

export function nodeRowsToMindmapState(
  rootNodeId: string,
  rows: Array<
    Pick<MindmapNodeRow, "id" | "parent_id" | "text" | "notes" | "order_index" | "pos_x" | "pos_y">
  >,
): MindmapState {
  const nodesById: Record<string, MindmapNode> = {};
  for (const row of rows) {
    const posX = row.pos_x ?? undefined;
    const posY = row.pos_y ?? undefined;
    nodesById[row.id] = {
      id: row.id,
      parentId: row.parent_id,
      text: row.text,
      notes: row.notes,
      orderIndex: row.order_index,
      ...(posX === undefined ? {} : { posX }),
      ...(posY === undefined ? {} : { posY }),
    };
  }
  return { rootNodeId, nodesById };
}
