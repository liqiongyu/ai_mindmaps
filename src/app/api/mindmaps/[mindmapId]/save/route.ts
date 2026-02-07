import { NextResponse, type NextRequest } from "next/server";

import { SaveMindmapRequestSchema } from "@/lib/mindmap/api";
import { mindmapStateToNodeRows } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingAtomicSaveRpc(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST202") return true;
  return /could not find the function/i.test(error.message);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = SaveMindmapRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body", { issues: parsed.error.issues });
  }

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,title,root_node_id")
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id)
    .maybeSingle();

  if (mindmapError) {
    return jsonError(500, "Failed to load mindmap", { detail: mindmapError.message });
  }
  if (!mindmap) {
    return jsonError(404, "Mindmap not found");
  }

  if (parsed.data.state.rootNodeId !== mindmap.root_node_id) {
    return jsonError(400, "rootNodeId mismatch");
  }

  const inferredTitle =
    parsed.data.title?.trim() ||
    parsed.data.state.nodesById[parsed.data.state.rootNodeId]?.text ||
    mindmap.title ||
    "Untitled";

  const rows = mindmapStateToNodeRows(mindmapId, parsed.data.state);
  const rpcNodes = rows.map((r) => ({
    id: r.id,
    parent_id: r.parent_id,
    text: r.text,
    notes: r.notes,
    order_index: r.order_index,
  }));

  const { error: rpcError } = await supabase.rpc("mma_replace_mindmap_nodes", {
    p_mindmap_id: mindmapId,
    p_root_node_id: mindmap.root_node_id,
    p_title: inferredTitle,
    p_nodes: rpcNodes,
  });

  if (!rpcError) {
    return NextResponse.json({ ok: true });
  }

  if (!isMissingAtomicSaveRpc(rpcError)) {
    return jsonError(500, "Failed to save mindmap nodes", { detail: rpcError.message });
  }

  // Fallback path (RPC not deployed): do a best-effort non-destructive save.
  const { error: updateError } = await supabase
    .from("mindmaps")
    .update({ title: inferredTitle })
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id);

  if (updateError) {
    return jsonError(500, "Failed to update mindmap", { detail: updateError.message });
  }

  const { error: upsertError } = await supabase.from("mindmap_nodes").upsert(rows, {
    onConflict: "id",
  });

  if (upsertError) {
    return jsonError(500, "Failed to save mindmap nodes", { detail: upsertError.message });
  }

  const ids = rows.map((r) => r.id);
  const inList = `(${ids.map((id) => `"${id}"`).join(",")})`;
  const { error: cleanupError } = await supabase
    .from("mindmap_nodes")
    .delete()
    .eq("mindmap_id", mindmapId)
    .not("id", "in", inList);

  if (cleanupError) {
    return jsonError(500, "Failed to save mindmap nodes", { detail: cleanupError.message });
  }

  return NextResponse.json({ ok: true });
}
