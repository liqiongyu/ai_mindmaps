import { z } from "zod";

import { MindmapStateSchema } from "./storage";

export const CreateMindmapRequestSchema = z
  .object({
    title: z.string().min(1).optional(),
    templateId: z.string().uuid().optional(),
  })
  .strict();

export const SaveMindmapRequestSchema = z
  .object({
    baseVersion: z.number().int().min(1),
    title: z.string().min(1).optional(),
    state: MindmapStateSchema,
  })
  .strict();

export type CreateMindmapRequest = z.infer<typeof CreateMindmapRequestSchema>;
export type SaveMindmapRequest = z.infer<typeof SaveMindmapRequestSchema>;
