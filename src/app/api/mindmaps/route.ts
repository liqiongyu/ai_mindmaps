import { NextResponse, type NextRequest } from "next/server";

import { CreateMindmapRequestSchema } from "@/lib/mindmap/api";
import { remapMindmapStateIds } from "@/lib/mindmap/importTryDraft";
import { listMindmapsPage } from "@/lib/mindmap/mindmapList";
import { MindmapStateSchema, mindmapStateToNodeRows } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingAtomicSaveRpc(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST202") return true;
  return /could not find the function/i.test(error.message);
}

function isMissingTemplatesSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const url = new URL(request.url);
  const result = await listMindmapsPage({
    supabase,
    userId: data.user.id,
    cursor: url.searchParams.get("cursor"),
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : null,
    q: url.searchParams.get("q"),
  });

  if (!result.ok) {
    const status =
      result.message === "Invalid cursor" || result.message === "Invalid query" ? 400 : 500;
    return jsonError(status, "Failed to list mindmaps", { detail: result.message });
  }

  return NextResponse.json({
    ok: true,
    items: result.items,
    nextCursor: result.nextCursor,
    total: result.total,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  let json: unknown = {};
  try {
    json = await request.json();
  } catch {
    // Treat missing/invalid JSON as empty payload for this endpoint.
  }

  const parsed = CreateMindmapRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body", { issues: parsed.error.issues });
  }

  if (parsed.data.templateId) {
    const { data: template, error: templateError } = await supabase
      .from("mindmap_templates")
      .select("id,title,state")
      .eq("id", parsed.data.templateId)
      .maybeSingle();

    if (templateError) {
      if (isMissingTemplatesSchema(templateError)) {
        return jsonError(503, "Templates schema is missing. Apply Supabase migrations first.", {
          detail: templateError.message,
        });
      }
      return jsonError(500, "Failed to load template", { detail: templateError.message });
    }
    if (!template) {
      return jsonError(404, "Template not found");
    }

    const templateState = MindmapStateSchema.safeParse(template.state);
    if (!templateState.success) {
      return jsonError(500, "Template state is invalid");
    }

    const { state: remappedState } = remapMindmapStateIds(templateState.data);
    const root = remappedState.nodesById[remappedState.rootNodeId];
    const derivedTitle = root?.text?.trim().slice(0, 120) || template.title || "Untitled";

    const mindmapId = crypto.randomUUID();
    const rootNodeId = remappedState.rootNodeId;

    const { error: insertMindmapError } = await supabase.from("mindmaps").insert({
      id: mindmapId,
      owner_id: data.user.id,
      title: derivedTitle,
      root_node_id: rootNodeId,
    });

    if (insertMindmapError) {
      return jsonError(500, "Failed to create mindmap", { detail: insertMindmapError.message });
    }

    const rows = mindmapStateToNodeRows(mindmapId, remappedState);
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
      p_root_node_id: rootNodeId,
      p_title: derivedTitle,
      p_nodes: rpcNodes,
      p_base_version: 1,
    });

    if (rpcError) {
      await supabase.from("mindmaps").delete().eq("id", mindmapId);
      const missing = isMissingAtomicSaveRpc(rpcError);
      const status = missing ? 503 : 500;
      const message = missing
        ? "Atomic save RPC is missing. Apply Supabase migrations first."
        : "Failed to create mindmap from template";
      return jsonError(status, message, { detail: rpcError.message });
    }

    if (!rpcData || typeof rpcData !== "object" || !("ok" in rpcData) || rpcData.ok !== true) {
      await supabase.from("mindmaps").delete().eq("id", mindmapId);
      return jsonError(500, "Failed to create mindmap from template", {
        detail: "Invalid RPC response",
      });
    }

    return NextResponse.json({ ok: true, mindmapId, rootNodeId }, { status: 201 });
  }

  const title = parsed.data.title?.trim() || "Untitled";
  const mindmapId = crypto.randomUUID();
  const rootNodeId = crypto.randomUUID();

  const { error: insertMindmapError } = await supabase.from("mindmaps").insert({
    id: mindmapId,
    owner_id: data.user.id,
    title,
    root_node_id: rootNodeId,
  });

  if (insertMindmapError) {
    return jsonError(500, "Failed to create mindmap", { detail: insertMindmapError.message });
  }

  const { error: insertRootNodeError } = await supabase.from("mindmap_nodes").insert({
    id: rootNodeId,
    mindmap_id: mindmapId,
    parent_id: null,
    text: title,
    notes: null,
    order_index: 0,
  });

  if (insertRootNodeError) {
    await supabase.from("mindmaps").delete().eq("id", mindmapId);
    return jsonError(500, "Failed to create root node", { detail: insertRootNodeError.message });
  }

  return NextResponse.json({ ok: true, mindmapId, rootNodeId }, { status: 201 });
}
