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
import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { validateOperationsScope } from "@/lib/mindmap/scope";
import { createAzureOpenAIClient, getAzureOpenAIConfigFromEnv } from "@/lib/llm/azureOpenAI";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingChatPersistenceSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
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

  const { data: messageRows, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id,role,content,operations,provider,model,created_at")
    .eq("thread_id", threadParsed.data.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

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
      createdAt: m.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return jsonError(401, "Unauthorized");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsedRequest = AiChatRequestSchema.safeParse(json);
  if (!parsedRequest.success) {
    return jsonError(400, "Invalid request body", { issues: parsedRequest.error.issues });
  }

  const {
    mindmapId,
    scope,
    selectedNodeId,
    userMessage,
    constraints: requestedConstraints,
  } = parsedRequest.data;
  const constraints = normalizeAiChatConstraints(requestedConstraints);

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,root_node_id")
    .eq("id", mindmapId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (mindmapError) {
    return jsonError(500, "Failed to load mindmap", { detail: mindmapError.message });
  }
  if (!mindmap) {
    return jsonError(404, "Mindmap not found");
  }

  const { data: nodeRows, error: nodesError } = await supabase
    .from("mindmap_nodes")
    .select("id,parent_id,text,notes,order_index")
    .eq("mindmap_id", mindmapId);

  if (nodesError) {
    return jsonError(500, "Failed to load mindmap nodes", { detail: nodesError.message });
  }

  const nodesParsed = z.array(MindmapNodeRowSchema).safeParse(nodeRows ?? []);
  if (!nodesParsed.success) {
    return jsonError(500, "Failed to parse mindmap nodes");
  }

  const state = nodeRowsToMindmapState(mindmap.root_node_id, nodesParsed.data);

  let modelName = "";
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
    mindmapContext = buildAiChatMindmapContext({ state, scope, selectedNodeId });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    if (scope === "node" && isNodeNotFoundError(detail)) {
      return jsonError(409, "Selected node is out of sync. Please wait for auto-save and retry.", {
        detail,
      });
    }
    return jsonError(500, "Failed to build AI context", { detail });
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

  try {
    const config = getAzureOpenAIConfigFromEnv(process.env);
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
        return jsonError(400, "Model output schema validation failed", {
          issues: lastError.issues,
        });
      }
      const message = lastError instanceof Error ? lastError.message : "Model call failed";
      if (/empty model output/i.test(message)) {
        return jsonError(502, "Empty model output");
      }
      if (/incomplete/i.test(message) || /max_output_tokens/i.test(message)) {
        return jsonError(502, "Model output truncated");
      }
      return jsonError(400, "Invalid model output", { detail: message });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Model call failed";
    return jsonError(500, "AI provider error", { detail: message });
  }

  if (!modelOutput) {
    return jsonError(500, "AI provider error", { detail: "Model output unavailable" });
  }

  const constraintCheck = validateAiChatOperationsAgainstConstraints({
    constraints,
    operations: modelOutput.operations,
  });
  if (!constraintCheck.ok) {
    return jsonError(400, constraintCheck.message);
  }

  const scopeCheck = validateOperationsScope({
    state,
    scope,
    selectedNodeId,
    operations: modelOutput.operations,
  });
  if (!scopeCheck.ok) {
    return jsonError(400, scopeCheck.message);
  }

  try {
    applyOperations(state, modelOutput.operations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid operations";
    return jsonError(400, message);
  }

  if (scope === "node" && !selectedNodeId) {
    return jsonError(400, "selectedNodeId is required for node-scoped chat");
  }

  const provider = "azure-openai" as const;
  const nodeId = scope === "node" ? (selectedNodeId ?? null) : null;
  const threadIdResult = await getOrCreateThreadId({ supabase, mindmapId, scope, nodeId });

  if (threadIdResult.ok) {
    const { error: insertError } = await supabase.from("chat_messages").insert([
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
        model: modelName || null,
      },
    ]);

    if (insertError && !isMissingChatPersistenceSchema(insertError)) {
      return jsonError(500, "Failed to persist chat messages", { detail: insertError.message });
    }
  } else if (!threadIdResult.missingSchema) {
    return jsonError(500, "Failed to persist chat thread", { detail: threadIdResult.message });
  }

  return NextResponse.json({
    ok: true,
    assistant_message: modelOutput.assistant_message,
    operations: modelOutput.operations,
    provider,
    model: modelName || null,
  });
}
