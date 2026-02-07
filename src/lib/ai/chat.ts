import { z } from "zod";

import { OperationSchema } from "../mindmap/ops";

export const AiChatRequestSchema = z
  .object({
    mindmapId: z.string().min(1),
    scope: z.enum(["global", "node"]),
    selectedNodeId: z.string().min(1).optional(),
    userMessage: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.scope === "node" && !value.selectedNodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "selectedNodeId is required for node-scoped chat",
        path: ["selectedNodeId"],
      });
    }
  });

export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

export const AiChatModelOutputSchema = z
  .object({
    assistant_message: z.string(),
    operations: z.array(OperationSchema),
  })
  .strict();

export type AiChatModelOutput = z.infer<typeof AiChatModelOutputSchema>;
