import { NextResponse, type NextRequest } from "next/server";

import { z } from "zod";

import { mindmapStateToNodeRows, MindmapStateSchema } from "@/lib/mindmap/storage";
import { MindmapUiStateSchema } from "@/lib/mindmap/uiState";
import { remapMindmapStateIds, remapMindmapUiStateIds } from "@/lib/mindmap/importTryDraft";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingAtomicSaveRpc(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST202") return true;
  return /could not find the function/i.test(error.message);
}

const ImportTryDraftRequestSchema = z
  .object({
    source: z.enum(["try", "copy"]),
    draft: MindmapStateSchema,
    ui: MindmapUiStateSchema.optional(),
  })
  .strict();

const MAX_TRY_DRAFT_NODES = 2000;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = ImportTryDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body", { issues: parsed.error.issues });
  }

  const nodeCount = Object.keys(parsed.data.draft.nodesById).length;
  if (nodeCount > MAX_TRY_DRAFT_NODES) {
    return jsonError(413, "Draft too large");
  }

  const { state: remappedDraft, idMap } = remapMindmapStateIds(parsed.data.draft);
  const root = remappedDraft.nodesById[remappedDraft.rootNodeId];
  const title = root?.text?.trim().slice(0, 120) || "Untitled";

  const mindmapId = crypto.randomUUID();

  const { error: insertMindmapError } = await supabase.from("mindmaps").insert({
    id: mindmapId,
    owner_id: data.user.id,
    title,
    root_node_id: remappedDraft.rootNodeId,
  });

  if (insertMindmapError) {
    return jsonError(500, "Failed to create mindmap", { detail: insertMindmapError.message });
  }

  const rows = mindmapStateToNodeRows(mindmapId, remappedDraft);
  const rpcNodes = rows.map((r) => ({
    id: r.id,
    parent_id: r.parent_id,
    text: r.text,
    notes: r.notes,
    order_index: r.order_index,
    pos_x: r.pos_x ?? undefined,
    pos_y: r.pos_y ?? undefined,
  }));

  const { data: rpcData, error: rpcError } = await supabase.rpc("mma_replace_mindmap_nodes", {
    p_mindmap_id: mindmapId,
    p_root_node_id: remappedDraft.rootNodeId,
    p_title: title,
    p_nodes: rpcNodes,
    p_base_version: 1,
  });

  if (rpcError) {
    await supabase.from("mindmaps").delete().eq("id", mindmapId);
    const message = isMissingAtomicSaveRpc(rpcError)
      ? "Atomic save RPC is missing. Apply Supabase migrations first."
      : "Failed to import mindmap nodes";
    return jsonError(500, message, { detail: rpcError.message });
  }

  if (!rpcData || typeof rpcData !== "object" || !("ok" in rpcData) || rpcData.ok !== true) {
    await supabase.from("mindmaps").delete().eq("id", mindmapId);
    return jsonError(500, "Failed to import mindmap nodes", { detail: "Invalid RPC response" });
  }

  if (parsed.data.ui) {
    const ui = remapMindmapUiStateIds(parsed.data.ui, idMap);
    await supabase.from("mindmap_ui_state").upsert(
      [
        {
          mindmap_id: mindmapId,
          collapsed_node_ids: ui.collapsedNodeIds,
          selected_node_id: ui.selectedNodeId,
          viewport: ui.viewport,
        },
      ],
      { onConflict: "mindmap_id" },
    );
  }

  return NextResponse.json({ ok: true, mindmapId }, { status: 201 });
}
