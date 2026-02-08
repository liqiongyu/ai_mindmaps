import { z } from "zod";

import { OperationSchema } from "../mindmap/ops";

export const AiChatConstraintsSchema = z
  .object({
    outputLanguage: z.enum(["zh", "en"]),
    branchCount: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8)]),
    depth: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    allowMove: z.boolean(),
    allowDelete: z.boolean(),
  })
  .strict();

export type AiChatConstraints = z.infer<typeof AiChatConstraintsSchema>;

export const AiChatRequestSchema = z
  .object({
    mindmapId: z.string().min(1),
    scope: z.enum(["global", "node"]),
    selectedNodeId: z.string().min(1).optional(),
    userMessage: z.string().min(1),
    constraints: AiChatConstraintsSchema.optional(),
    dryRun: z.boolean().optional(),
    providedOutput: z
      .object({
        assistant_message: z.string(),
        operations: z.array(OperationSchema).max(200),
        provider: z.string().nullable().optional(),
        model: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
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

export const AiChatHistoryRequestSchema = z
  .object({
    mindmapId: z.string().min(1),
    scope: z.enum(["global", "node"]),
    selectedNodeId: z.string().min(1).optional(),
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

export type AiChatHistoryRequest = z.infer<typeof AiChatHistoryRequestSchema>;

export const AiChatModelOutputSchema = z
  .object({
    assistant_message: z.string(),
    operations: z.array(OperationSchema).max(200),
  })
  .strict();

export type AiChatModelOutput = z.infer<typeof AiChatModelOutputSchema>;

export const AiChatMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type AiChatMessageRole = z.infer<typeof AiChatMessageRoleSchema>;

export const AiChatThreadSchema = z
  .object({
    id: z.string(),
    scope: z.enum(["global", "node"]),
    nodeId: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();

export type AiChatThread = z.infer<typeof AiChatThreadSchema>;

export const AiChatPersistedMessageSchema = z
  .object({
    id: z.string(),
    role: AiChatMessageRoleSchema,
    content: z.string(),
    operations: z.array(OperationSchema).nullable(),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.role === "assistant" && value.operations === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "operations is required for assistant messages",
        path: ["operations"],
      });
    }
    if (value.role !== "assistant" && value.operations !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "operations must be null for non-assistant messages",
        path: ["operations"],
      });
    }
  });

export type AiChatPersistedMessage = z.infer<typeof AiChatPersistedMessageSchema>;

export const AiChatHistoryResponseSchema = z
  .object({
    ok: z.literal(true),
    thread: AiChatThreadSchema.nullable(),
    messages: z.array(AiChatPersistedMessageSchema),
  })
  .strict();

export type AiChatHistoryResponse = z.infer<typeof AiChatHistoryResponseSchema>;

export const AiChatExportRequestSchema = AiChatHistoryRequestSchema;
export type AiChatExportRequest = z.infer<typeof AiChatExportRequestSchema>;

export const AiChatExportResponseSchema = z
  .object({
    ok: z.literal(true),
    version: z.literal("v1"),
    exportedAt: z.string(),
    mindmapId: z.string(),
    thread: AiChatThreadSchema,
    messages: z.array(AiChatPersistedMessageSchema),
  })
  .strict();

export type AiChatExportResponse = z.infer<typeof AiChatExportResponseSchema>;
