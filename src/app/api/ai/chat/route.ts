import { NextResponse } from "next/server";

import { z } from "zod";

import {
  AiChatHistoryRequestSchema,
  AiChatModelOutputSchema,
  AiChatRequestSchema,
} from "@/lib/ai/chat";
import {
  buildAiChatConstraintsInstructionBlock,
  normalizeAiChatConstraints,
  validateAiChatOperationsAgainstConstraints,
} from "@/lib/ai/chatConstraints";
import { buildAiChatMindmapContext } from "@/lib/ai/chatContext";
import { normalizeAiMindmapOperationIds } from "@/lib/ai/mindmapOps";
import { parseFirstJsonObject } from "@/lib/ai/json";
import { OperationSchema, applyOperations } from "@/lib/mindmap/ops";
import { computeDeleteImpact } from "@/lib/mindmap/operationImpact";
import { summarizeOperations } from "@/lib/mindmap/operationSummary";
import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { validateOperationsScope } from "@/lib/mindmap/scope";
import { createAzureOpenAIClient, getAzureOpenAIConfigFromEnv } from "@/lib/llm/azureOpenAI";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logApi } from "@/lib/telemetry/apiLog";
import { getPlanKeyFromEnv, getUpgradeUrlFromEnv } from "@/lib/usage/plan";
import { checkQuota, consumeQuota } from "@/lib/usage/quota";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingChatPersistenceSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

function isMissingChatMessagesMetadataColumn(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST204") return true;
  return /could not find the 'metadata' column/i.test(error.message);
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

function isNodeNotFoundError(message: string): boolean {
  return /^Node not found:/i.test(message);
}

const MindmapNodeRowSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  text: z.string(),
  notes: z.string().nullable(),
  order_index: z.number(),
});

const ChatThreadRowSchema = z.object({
  id: z.string(),
  scope: z.enum(["global", "node"]),
  node_id: z.string().nullable(),
  created_at: z.string(),
});

const ChatMessageRowBaseSchema = z.object({
  id: z.string(),
  content: z.string(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
});

const ChatMessageRowSchema = z.discriminatedUnion("role", [
  ChatMessageRowBaseSchema.extend({
    role: z.literal("assistant"),
    operations: z.array(OperationSchema),
  }),
  ChatMessageRowBaseSchema.extend({
    role: z.literal("user"),
    operations: z.null(),
  }),
  ChatMessageRowBaseSchema.extend({
    role: z.literal("system"),
    operations: z.null(),
  }),
]);

async function getOrCreateThreadId({
  supabase,
  mindmapId,
  scope,
  nodeId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  mindmapId: string;
  scope: "global" | "node";
  nodeId: string | null;
}): Promise<
  { ok: true; threadId: string } | { ok: false; missingSchema: boolean; message: string }
> {
  const baseQuery = supabase
    .from("chat_threads")
    .select("id")
    .eq("mindmap_id", mindmapId)
    .eq("scope", scope);

  const selectResult =
    scope === "global"
      ? await baseQuery.is("node_id", null).maybeSingle()
      : await baseQuery.eq("node_id", nodeId).maybeSingle();

  if (selectResult.error) {
    return {
      ok: false,
      missingSchema: isMissingChatPersistenceSchema(selectResult.error),
      message: selectResult.error.message,
    };
  }

  if (selectResult.data?.id) {
    return { ok: true, threadId: selectResult.data.id };
  }

  const insertResult = await supabase
    .from("chat_threads")
    .insert({
      mindmap_id: mindmapId,
      scope,
      node_id: nodeId,
    })
    .select("id")
    .single();

  if (!insertResult.error && insertResult.data?.id) {
    return { ok: true, threadId: insertResult.data.id };
  }

  if (insertResult.error && isUniqueViolation(insertResult.error)) {
    const reselectResult =
      scope === "global"
        ? await baseQuery.is("node_id", null).maybeSingle()
        : await baseQuery.eq("node_id", nodeId).maybeSingle();

    if (reselectResult.error) {
      return {
        ok: false,
        missingSchema: isMissingChatPersistenceSchema(reselectResult.error),
        message: reselectResult.error.message,
      };
    }

    if (reselectResult.data?.id) {
      return { ok: true, threadId: reselectResult.data.id };
    }
  }

  return {
    ok: false,
    missingSchema: insertResult.error ? isMissingChatPersistenceSchema(insertResult.error) : false,
    message: insertResult.error?.message ?? "Failed to create chat thread",
  };
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return jsonError(401, "Unauthorized");
  }

  const url = new URL(request.url);
  const parsedRequest = AiChatHistoryRequestSchema.safeParse({
    mindmapId: url.searchParams.get("mindmapId") ?? "",
    scope: url.searchParams.get("scope") ?? "",
    selectedNodeId: url.searchParams.get("selectedNodeId") ?? undefined,
  });

  if (!parsedRequest.success) {
    return jsonError(400, "Invalid request query", { issues: parsedRequest.error.issues });
  }

  const { mindmapId, scope, selectedNodeId } = parsedRequest.data;

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id")
    .eq("id", mindmapId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (mindmapError) {
    return jsonError(500, "Failed to load mindmap", { detail: mindmapError.message });
  }
  if (!mindmap) {
    return jsonError(404, "Mindmap not found");
  }

  const threadQuery = supabase
    .from("chat_threads")
    .select("id,scope,node_id,created_at")
    .eq("mindmap_id", mindmapId)
    .eq("scope", scope);

  const threadResult =
    scope === "global"
      ? await threadQuery.is("node_id", null).maybeSingle()
      : await threadQuery.eq("node_id", selectedNodeId).maybeSingle();

  if (threadResult.error) {
    if (isMissingChatPersistenceSchema(threadResult.error)) {
      return NextResponse.json({ ok: true, thread: null, messages: [] });
    }
    return jsonError(500, "Failed to load chat thread", { detail: threadResult.error.message });
  }

  if (!threadResult.data) {
    return NextResponse.json({ ok: true, thread: null, messages: [] });
  }

  const threadParsed = ChatThreadRowSchema.safeParse(threadResult.data);
  if (!threadParsed.success) {
    return jsonError(500, "Failed to parse chat thread");
  }

  const messagesSelectWithMetadata =
    "id,role,content,operations,provider,model,created_at,metadata";

  let messageRows: unknown = null;
  let messagesError: { code?: string; message: string } | null = null;

  const primaryMessagesResult = await supabase
    .from("chat_messages")
    .select(messagesSelectWithMetadata)
    .eq("thread_id", threadParsed.data.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  messageRows = primaryMessagesResult.data;
  messagesError = primaryMessagesResult.error;

  if (messagesError && isMissingChatMessagesMetadataColumn(messagesError)) {
    const fallbackMessagesResult = await supabase
      .from("chat_messages")
      .select("id,role,content,operations,provider,model,created_at")
      .eq("thread_id", threadParsed.data.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    messageRows = fallbackMessagesResult.data;
    messagesError = fallbackMessagesResult.error;
  }

  if (messagesError) {
    if (isMissingChatPersistenceSchema(messagesError)) {
      return NextResponse.json({ ok: true, thread: null, messages: [] });
    }
    return jsonError(500, "Failed to load chat messages", { detail: messagesError.message });
  }

  const messagesParsed = z.array(ChatMessageRowSchema).safeParse(messageRows ?? []);
  if (!messagesParsed.success) {
    return jsonError(500, "Failed to parse chat messages");
  }

  return NextResponse.json({
    ok: true,
    thread: {
      id: threadParsed.data.id,
      scope: threadParsed.data.scope,
      nodeId: threadParsed.data.node_id,
      createdAt: threadParsed.data.created_at,
    },
    messages: messagesParsed.data.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      operations: m.operations,
      provider: m.provider,
      model: m.model,
      metadata: m.metadata,
      createdAt: m.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const route = "/api/ai/chat";
  const method = "POST";
  let userId: string | null = null;
  const planKey = getPlanKeyFromEnv();
  const upgradeUrl = getUpgradeUrlFromEnv();

  const respondOk = (payload: Record<string, unknown>) => {
    logApi({
      type: "api",
      route,
      method,
      status: 200,
      ok: true,
      duration_ms: Date.now() - startedAt,
      user_id: userId,
    });
    return NextResponse.json({ ok: true, ...payload });
  };

  const respondError = (
    status: number,
    code: string,
    message: string,
    extra?: Record<string, unknown>,
  ) => {
    logApi(
      {
        type: "api",
        route,
        method,
        status,
        ok: false,
        code,
        duration_ms: Date.now() - startedAt,
        user_id: userId,
        detail: typeof extra?.detail === "string" ? extra.detail : undefined,
      },
      status >= 500 ? "error" : "warn",
    );
    return NextResponse.json({ ok: false, code, message, ...extra }, { status });
  };

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return respondError(401, "UNAUTHORIZED", "Unauthorized");
  }
  userId = authData.user.id;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return respondError(400, "INVALID_JSON", "Invalid JSON body");
  }

  const parsedRequest = AiChatRequestSchema.safeParse(json);
  if (!parsedRequest.success) {
    return respondError(400, "INVALID_BODY", "Invalid request body", {
      issues: parsedRequest.error.issues,
    });
  }

  const {
    mindmapId,
    scope,
    selectedNodeId,
    userMessage,
    constraints: requestedConstraints,
    dryRun: dryRunRequested,
    providedOutput,
  } = parsedRequest.data;
  const dryRun = Boolean(dryRunRequested);
  const constraints = normalizeAiChatConstraints(requestedConstraints);

  if (dryRun && providedOutput) {
    return respondError(400, "INVALID_REQUEST", "providedOutput cannot be used with dryRun");
  }

  if (scope === "node" && !selectedNodeId) {
    return respondError(
      400,
      "MISSING_SELECTED_NODE_ID",
      "selectedNodeId is required for node-scoped chat",
    );
  }

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,root_node_id")
    .eq("id", mindmapId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (mindmapError) {
    return respondError(500, "MINDMAP_LOAD_FAILED", "Failed to load mindmap", {
      detail: mindmapError.message,
    });
  }
  if (!mindmap) {
    return respondError(404, "MINDMAP_NOT_FOUND", "Mindmap not found");
  }

  if (providedOutput) {
    const provider = providedOutput.provider ?? null;
    const modelName = providedOutput.model ?? null;

    const normalized = normalizeAiMindmapOperationIds({
      state: { rootNodeId: mindmap.root_node_id, nodesById: {} },
      operations: providedOutput.operations,
    });
    if (!normalized.ok) {
      return respondError(400, "PROVIDED_OUTPUT_INVALID", normalized.message);
    }

    if (JSON.stringify(normalized.operations) !== JSON.stringify(providedOutput.operations)) {
      return respondError(
        400,
        "PROVIDED_OUTPUT_NOT_NORMALIZED",
        "providedOutput.operations must already be normalized UUID ops",
      );
    }

    for (const op of normalized.operations) {
      if (op.type === "delete_node" && op.nodeId === mindmap.root_node_id) {
        return respondError(400, "ROOT_NODE_OPERATION", "Cannot delete root node");
      }
      if (op.type === "move_node" && op.nodeId === mindmap.root_node_id) {
        return respondError(400, "ROOT_NODE_OPERATION", "Cannot move root node");
      }
    }

    const changeSummary = summarizeOperations(normalized.operations);
    let deleteImpact: { nodes: number } | null = null;
    try {
      const { data: nodeRows, error: nodesError } = await supabase
        .from("mindmap_nodes")
        .select("id,parent_id,text,notes,order_index")
        .eq("mindmap_id", mindmapId);
      if (!nodesError) {
        const nodesParsed = z.array(MindmapNodeRowSchema).safeParse(nodeRows ?? []);
        if (nodesParsed.success) {
          const state = nodeRowsToMindmapState(mindmap.root_node_id, nodesParsed.data);
          deleteImpact = computeDeleteImpact(state, normalized.operations);
        }
      }
    } catch {
      // Best effort: export can still succeed without delete impact.
    }

    const assistantMetadata = {
      constraints,
      changeSummary,
      ...(deleteImpact ? { deleteImpact } : {}),
      scope,
      selectedNodeId: scope === "node" ? (selectedNodeId ?? null) : null,
      dryRun: false,
    };
    const nodeId = scope === "node" ? (selectedNodeId ?? null) : null;
    const threadIdResult = await getOrCreateThreadId({ supabase, mindmapId, scope, nodeId });

    let chatPersisted = false;
    if (threadIdResult.ok) {
      const messagesWithMetadata = [
        {
          thread_id: threadIdResult.threadId,
          role: "user",
          content: userMessage,
          operations: null,
          provider: null,
          model: null,
        },
        {
          thread_id: threadIdResult.threadId,
          role: "assistant",
          content: providedOutput.assistant_message,
          operations: normalized.operations,
          provider,
          model: modelName,
          metadata: assistantMetadata,
        },
      ];

      let { error: insertError } = await supabase
        .from("chat_messages")
        .insert(messagesWithMetadata);
      if (insertError && isMissingChatMessagesMetadataColumn(insertError)) {
        ({ error: insertError } = await supabase.from("chat_messages").insert(
          messagesWithMetadata.map((message) => ({
            thread_id: message.thread_id,
            role: message.role,
            content: message.content,
            operations: message.operations,
            provider: message.provider,
            model: message.model,
          })),
        ));
      }

      if (!insertError) {
        chatPersisted = true;
      } else if (!isMissingChatPersistenceSchema(insertError)) {
        return respondError(
          500,
          "CHAT_PERSIST_MESSAGES_FAILED",
          "Failed to persist chat messages",
          {
            detail: insertError.message,
          },
        );
      }
    } else if (!threadIdResult.missingSchema) {
      return respondError(500, "CHAT_PERSIST_THREAD_FAILED", "Failed to persist chat thread", {
        detail: threadIdResult.message,
      });
    }

    return respondOk({
      assistant_message: providedOutput.assistant_message,
      operations: normalized.operations,
      provider,
      model: modelName,
      dryRun: false,
      changeSummary,
      persistence: { chatPersisted },
    });
  }

  const { data: nodeRows, error: nodesError } = await supabase
    .from("mindmap_nodes")
    .select("id,parent_id,text,notes,order_index")
    .eq("mindmap_id", mindmapId);

  if (nodesError) {
    return respondError(500, "NODES_LOAD_FAILED", "Failed to load mindmap nodes", {
      detail: nodesError.message,
    });
  }

  const nodesParsed = z.array(MindmapNodeRowSchema).safeParse(nodeRows ?? []);
  if (!nodesParsed.success) {
    return respondError(500, "NODES_PARSE_FAILED", "Failed to parse mindmap nodes");
  }

  const state = nodeRowsToMindmapState(mindmap.root_node_id, nodesParsed.data);

  let provider: string | null = null;
  let modelName: string | null = null;
  let modelOutput: z.infer<typeof AiChatModelOutputSchema> | null = null;

  const constraintsInstructionBlock = buildAiChatConstraintsInstructionBlock(constraints);
  const outputLanguageInstruction =
    constraints.outputLanguage === "zh"
      ? "assistant_message MUST be in Chinese."
      : "assistant_message MUST be in English.";

  const instructions = [
    "You edit a mindmap by returning JSON ops.",
    "Return ONLY a single JSON object (no markdown, no code fences).",
    "assistant_message should be concise (<= 2 sentences).",
    outputLanguageInstruction,
    "",
    "Output schema:",
    '{ "assistant_message": string, "operations": Operation[] }',
    "",
    "Operation types:",
    '- add_node: { type: \"add_node\", nodeId, parentId, text, index? }',
    '- rename_node: { type: \"rename_node\", nodeId, text }',
    '- update_notes: { type: \"update_notes\", nodeId, notes }',
    '- move_node: { type: \"move_node\", nodeId, newParentId, index? }',
    '- delete_node: { type: \"delete_node\", nodeId }',
    '- reorder_children: { type: \"reorder_children\", parentId, orderedChildIds }',
    "",
    constraintsInstructionBlock,
    "",
    "Rules:",
    "- Do not delete or move the root node.",
    constraints.allowDelete
      ? "- You MAY delete nodes if explicitly requested by the user (never delete the root node)."
      : "- Do not delete nodes (do not output delete_node).",
    constraints.allowMove
      ? "- You MAY move or reorder nodes when it improves clarity."
      : "- Do not move or reorder nodes (do not output move_node or reorder_children).",
    `- When adding new nodes, aim for about ${constraints.branchCount} branches and depth up to ${constraints.depth} levels for newly added content.`,
    "- Reference existing nodes by their id.",
    '- For add_node, set nodeId to a UNIQUE temporary id (e.g. "n1", "n2"). The system will replace it with a UUID.',
    "- If uncertain, set operations to [] and ask a clarifying question in assistant_message.",
    scope === "node"
      ? "- Node scope: only modify the selected node subtree; new nodes must be added under allowed parents."
      : "- Global scope: you may modify any nodes in the mindmap.",
  ].join("\n");

  let mindmapContext = "";
  try {
    const contextResult = buildAiChatMindmapContext({ state, scope, selectedNodeId });
    if (!contextResult.ok) {
      return respondError(413, contextResult.code, "Context too large", {
        hints: contextResult.hints,
        context: contextResult.meta,
      });
    }
    mindmapContext = contextResult.context;
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    if (scope === "node" && isNodeNotFoundError(detail)) {
      return respondError(
        409,
        "CONTEXT_NODE_OUT_OF_SYNC",
        "Selected node is out of sync. Please wait for auto-save and retry.",
        { detail },
      );
    }
    return respondError(500, "CONTEXT_BUILD_FAILED", "Failed to build AI context", { detail });
  }

  const input = [
    "Return valid json only.",
    `Scope: ${scope}`,
    "",
    mindmapContext,
    "",
    "User message:",
    userMessage,
  ]
    .filter(Boolean)
    .join("\n");

  let quota: Awaited<ReturnType<typeof checkQuota>>;
  try {
    quota = await checkQuota({
      supabase,
      metric: "ai_chat",
      plan: planKey,
      period: "day",
      amount: 1,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return respondError(500, "QUOTA_CHECK_FAILED", "Failed to check quota", { detail });
  }

  if (!quota.ok) {
    return respondError(429, "quota_exceeded", "今日 AI 调用已达上限，明日重置或升级套餐。", {
      metric: quota.metric,
      used: quota.used,
      limit: quota.limit,
      resetAt: quota.resetAt,
      upgradeUrl,
      phase: "precheck",
    });
  }

  try {
    const config = getAzureOpenAIConfigFromEnv(process.env);
    provider = "azure-openai";
    modelName = config.model;
    const client = createAzureOpenAIClient(config);

    const attempts: Array<{ maxOutputTokens: number; extraInstructions?: string }> = [
      { maxOutputTokens: 4096 },
      {
        maxOutputTokens: 8192,
        extraInstructions:
          "Your previous output was invalid, truncated, or empty. Return the complete JSON object only.",
      },
    ];

    let lastError: unknown = null;
    for (const attempt of attempts) {
      try {
        const response = await client.responses.create({
          model: config.model,
          reasoning: { effort: "minimal" },
          instructions: attempt.extraInstructions
            ? `${instructions}\n\n${attempt.extraInstructions}`
            : instructions,
          input,
          max_output_tokens: attempt.maxOutputTokens,
          text: {
            format: { type: "json_object" },
            verbosity: "low",
          },
        });

        if (
          response.status === "incomplete" ||
          response.incomplete_details?.reason === "max_output_tokens"
        ) {
          throw new Error("Model response incomplete (max_output_tokens)");
        }

        const outputText = response.output_text ?? "";
        if (!outputText.trim()) {
          throw new Error("Empty model output");
        }

        const parsedModel = parseFirstJsonObject(outputText);
        const schemaCheck = AiChatModelOutputSchema.safeParse(parsedModel);
        if (!schemaCheck.success) {
          throw schemaCheck.error;
        }

        const normalized = normalizeAiMindmapOperationIds({
          state,
          operations: schemaCheck.data.operations,
        });
        if (!normalized.ok) {
          throw new Error(normalized.message);
        }

        modelOutput = {
          ...schemaCheck.data,
          operations: normalized.operations,
        };
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!modelOutput) {
      if (lastError instanceof z.ZodError) {
        return respondError(
          502,
          "MODEL_OUTPUT_SCHEMA_INVALID",
          "Model output schema validation failed",
          {
            issues: lastError.issues,
          },
        );
      }
      const message = lastError instanceof Error ? lastError.message : "Model call failed";
      if (/empty model output/i.test(message)) {
        return respondError(502, "model_output_empty", "Empty model output", {
          hints: [
            "Switch to node scope and focus on a smaller subtree.",
            "Reduce depth/branching constraints and retry.",
            "Ask the AI to only work on the current branch.",
          ],
        });
      }
      if (/incomplete/i.test(message) || /max_output_tokens/i.test(message)) {
        return respondError(502, "model_output_truncated", "Model output truncated", {
          hints: [
            "Switch to node scope and focus on a smaller subtree.",
            "Reduce depth/branching constraints and retry.",
            "Ask the AI to only work on the current branch.",
          ],
        });
      }
      return respondError(502, "MODEL_OUTPUT_INVALID", "Invalid model output", {
        detail: message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Model call failed";
    return respondError(502, "PROVIDER_ERROR", "AI provider error", { detail: message });
  }

  if (!modelOutput) {
    return respondError(500, "MODEL_OUTPUT_UNAVAILABLE", "Model output unavailable");
  }

  const constraintCheck = validateAiChatOperationsAgainstConstraints({
    constraints,
    operations: modelOutput.operations,
  });
  if (!constraintCheck.ok) {
    return respondError(400, "CONSTRAINT_VIOLATION", constraintCheck.message);
  }

  const scopeCheck = validateOperationsScope({
    state,
    scope,
    selectedNodeId,
    operations: modelOutput.operations,
  });
  if (!scopeCheck.ok) {
    return respondError(400, "SCOPE_VIOLATION", scopeCheck.message);
  }

  const changeSummary = summarizeOperations(modelOutput.operations);
  const deleteImpact = computeDeleteImpact(state, modelOutput.operations);

  try {
    applyOperations(state, modelOutput.operations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid operations";
    return respondError(400, "OPERATIONS_APPLY_FAILED", message);
  }

  let chargedQuota: Awaited<ReturnType<typeof consumeQuota>>;
  try {
    chargedQuota = await consumeQuota({
      supabase,
      metric: "ai_chat",
      plan: planKey,
      period: "day",
      amount: 1,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return respondError(500, "QUOTA_CHARGE_FAILED", "Failed to charge quota", { detail });
  }

  if (!chargedQuota.ok) {
    return respondError(429, "quota_exceeded", "今日 AI 调用已达上限，明日重置或升级套餐。", {
      metric: chargedQuota.metric,
      used: chargedQuota.used,
      limit: chargedQuota.limit,
      resetAt: chargedQuota.resetAt,
      upgradeUrl,
      phase: "consume",
    });
  }

  let chatPersisted = false;
  if (!dryRun) {
    const nodeId = scope === "node" ? (selectedNodeId ?? null) : null;
    const threadIdResult = await getOrCreateThreadId({ supabase, mindmapId, scope, nodeId });

    if (threadIdResult.ok) {
      const assistantMetadata = {
        constraints,
        changeSummary,
        deleteImpact,
        scope,
        selectedNodeId: scope === "node" ? (selectedNodeId ?? null) : null,
        dryRun,
      };

      const messagesWithMetadata = [
        {
          thread_id: threadIdResult.threadId,
          role: "user",
          content: userMessage,
          operations: null,
          provider: null,
          model: null,
        },
        {
          thread_id: threadIdResult.threadId,
          role: "assistant",
          content: modelOutput.assistant_message,
          operations: modelOutput.operations,
          provider,
          model: modelName ?? null,
          metadata: assistantMetadata,
        },
      ];

      let { error: insertError } = await supabase
        .from("chat_messages")
        .insert(messagesWithMetadata);
      if (insertError && isMissingChatMessagesMetadataColumn(insertError)) {
        ({ error: insertError } = await supabase.from("chat_messages").insert(
          messagesWithMetadata.map((message) => ({
            thread_id: message.thread_id,
            role: message.role,
            content: message.content,
            operations: message.operations,
            provider: message.provider,
            model: message.model,
          })),
        ));
      }

      if (!insertError) {
        chatPersisted = true;
      } else if (!isMissingChatPersistenceSchema(insertError)) {
        console.warn(
          JSON.stringify({
            ts: new Date().toISOString(),
            type: "chat_persist_warning",
            mindmapId,
            scope,
            selectedNodeId: scope === "node" ? selectedNodeId : null,
            detail: insertError.message,
          }),
        );
      }
    } else if (!threadIdResult.missingSchema) {
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          type: "chat_thread_warning",
          mindmapId,
          scope,
          selectedNodeId: scope === "node" ? selectedNodeId : null,
          detail: threadIdResult.message,
        }),
      );
    }
  }

  return respondOk({
    assistant_message: modelOutput.assistant_message,
    operations: modelOutput.operations,
    provider,
    model: modelName,
    dryRun,
    changeSummary,
    deleteImpact,
    persistence: { chatPersisted },
  });
}
