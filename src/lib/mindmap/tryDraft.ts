import { z } from "zod";

import { MindmapStateSchema } from "./storage";
import { MindmapViewportSchema } from "./uiState";
import { remapMindmapStateIds, remapMindmapUiStateIds } from "./importTryDraft";

export const TRY_DRAFT_STORAGE_KEY = "mma:try:draft:v1";

const TryDraftUiSchema = z.object({
  collapsedNodeIds: z.array(z.string().min(1)),
  selectedNodeId: z.string().min(1).nullable(),
  viewport: MindmapViewportSchema.nullable().default(null),
});

export const TryDraftSchema = z.object({
  state: MindmapStateSchema,
  updatedAt: z.string().datetime(),
  ui: TryDraftUiSchema,
});

export type TryDraft = z.infer<typeof TryDraftSchema>;

const LegacyMindmapNodeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  text: z.string().min(1),
  notes: z.string().nullable(),
  orderIndex: z.number().int().nonnegative(),
  posX: z.number().finite().optional(),
  posY: z.number().finite().optional(),
});

const LegacyMindmapStateSchema = z
  .object({
    rootNodeId: z.string().min(1),
    nodesById: z.record(z.string().min(1), LegacyMindmapNodeSchema),
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
    if (root.parentId !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Root node parentId must be null",
        path: ["nodesById", value.rootNodeId, "parentId"],
      });
    }

    for (const [nodeId, node] of Object.entries(value.nodesById)) {
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

const LegacyTryDraftSchema = z.object({
  state: LegacyMindmapStateSchema,
  updatedAt: z.string().datetime(),
  ui: TryDraftUiSchema,
});

export function parseTryDraftJson(json: string): TryDraft | null {
  try {
    const value = JSON.parse(json) as unknown;
    const parsed = TryDraftSchema.safeParse(value);
    if (parsed.success) return parsed.data;

    const legacyParsed = LegacyTryDraftSchema.safeParse(value);
    if (!legacyParsed.success) return null;

    const { state: remappedState, idMap } = remapMindmapStateIds(legacyParsed.data.state);
    const remappedUi = remapMindmapUiStateIds(legacyParsed.data.ui, idMap);
    return {
      state: remappedState,
      updatedAt: legacyParsed.data.updatedAt,
      ui: {
        collapsedNodeIds: remappedUi.collapsedNodeIds,
        selectedNodeId: remappedUi.selectedNodeId,
        viewport: remappedUi.viewport,
      },
    };
  } catch {
    return null;
  }
}

export function stringifyTryDraft(draft: TryDraft): string {
  return JSON.stringify(draft);
}
