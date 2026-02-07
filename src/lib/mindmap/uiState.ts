import { z } from "zod";

export const MindmapViewportSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().finite(),
});

export type MindmapViewport = z.infer<typeof MindmapViewportSchema>;

export const MindmapUiStateSchema = z.object({
  collapsedNodeIds: z.array(z.string().min(1)).default([]),
  selectedNodeId: z.string().min(1).nullable().default(null),
  viewport: MindmapViewportSchema.nullable().default(null),
});

export type MindmapUiState = z.infer<typeof MindmapUiStateSchema>;
