import { NextResponse } from "next/server";

import { z } from "zod";

import { AiChatModelOutputSchema, AiChatRequestSchema } from "@/lib/ai/chat";
import { parseFirstJsonObject } from "@/lib/ai/json";
import { applyOperations } from "@/lib/mindmap/ops";
import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { validateOperationsScope } from "@/lib/mindmap/scope";
import { createAzureOpenAIClient, getAzureOpenAIConfigFromEnv } from "@/lib/llm/azureOpenAI";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Not implemented. This endpoint will accept a chat request and return assistant_message + operations[].",
    },
    { status: 501 },
  );
}

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

const MindmapNodeRowSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  text: z.string(),
  notes: z.string().nullable(),
  order_index: z.number(),
});

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

  const { mindmapId, scope, selectedNodeId, userMessage } = parsedRequest.data;

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

  let modelOutputText = "";
  try {
    const config = getAzureOpenAIConfigFromEnv(process.env);
    const client = createAzureOpenAIClient(config);

    const instructions = [
      "You edit a mindmap by returning JSON ops.",
      "Return ONLY a single JSON object (no markdown, no code fences).",
      "",
      "Output schema:",
      '{ "assistant_message": string, "operations": Operation[] }',
      "",
      "Operation types:",
      '- add_node: { type: "add_node", nodeId, parentId, text, index? }',
      '- rename_node: { type: "rename_node", nodeId, text }',
      '- update_notes: { type: "update_notes", nodeId, notes }',
      '- move_node: { type: "move_node", nodeId, newParentId, index? }',
      '- delete_node: { type: "delete_node", nodeId }',
      '- reorder_children: { type: "reorder_children", parentId, orderedChildIds }',
      "",
      "Rules:",
      "- Do not delete or move the root node.",
      "- Reference existing nodes by their id.",
      "- If uncertain, set operations to [] and ask a clarifying question in assistant_message.",
      scope === "node"
        ? "- Node scope: only modify the selected node subtree; new nodes must be added under allowed parents."
        : "- Global scope: you may modify any nodes in the mindmap.",
    ].join("\n");

    const input = [
      `Scope: ${scope}`,
      selectedNodeId ? `Selected node: ${selectedNodeId}` : "",
      "",
      "Current mindmap state (JSON):",
      JSON.stringify(
        {
          rootNodeId: state.rootNodeId,
          nodes: Object.values(state.nodesById),
        },
        null,
        2,
      ),
      "",
      "User message:",
      userMessage,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.responses.create({
      model: config.model,
      instructions,
      input,
      max_output_tokens: 2048,
    });

    modelOutputText = response.output_text ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Model call failed";
    return jsonError(500, "AI provider error", { detail: message });
  }

  if (!modelOutputText.trim()) {
    return jsonError(502, "Empty model output");
  }

  let parsedModel: unknown;
  try {
    parsedModel = parseFirstJsonObject(modelOutputText);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse model JSON";
    return jsonError(400, "Invalid model output", { detail: message });
  }

  const parsedOutput = AiChatModelOutputSchema.safeParse(parsedModel);
  if (!parsedOutput.success) {
    return jsonError(400, "Model output schema validation failed", {
      issues: parsedOutput.error.issues,
    });
  }

  const scopeCheck = validateOperationsScope({
    state,
    scope,
    selectedNodeId,
    operations: parsedOutput.data.operations,
  });
  if (!scopeCheck.ok) {
    return jsonError(400, scopeCheck.message);
  }

  try {
    applyOperations(state, parsedOutput.data.operations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid operations";
    return jsonError(400, message);
  }

  return NextResponse.json({
    ok: true,
    assistant_message: parsedOutput.data.assistant_message,
    operations: parsedOutput.data.operations,
  });
}
