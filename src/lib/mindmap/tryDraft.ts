import { z } from "zod";

import { MindmapStateSchema } from "./storage";
import { MindmapViewportSchema } from "./uiState";

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

export function parseTryDraftJson(json: string): TryDraft | null {
  try {
    const value = JSON.parse(json) as unknown;
    const parsed = TryDraftSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function stringifyTryDraft(draft: TryDraft): string {
  return JSON.stringify(draft);
}
