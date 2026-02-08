import { NextResponse, type NextRequest } from "next/server";

import { SaveMindmapRequestSchema } from "@/lib/mindmap/api";
import { mindmapStateToNodeRows } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logApi } from "@/lib/telemetry/apiLog";

function isMissingAtomicSaveRpc(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST202") return true;
  return /could not find the function/i.test(error.message);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const startedAt = Date.now();
  const route = "/api/mindmaps/[mindmapId]/save";
  const method = "POST";
  let userId: string | null = null;

  const respond = (
    status: number,
    payload:
      | { ok: true; version: number }
      | {
          ok: false;
          message: string;
          code?: string;
          detail?: string;
          serverVersion?: number;
        },
  ) => {
    logApi(
      {
        type: "api",
        route,
        method,
        status,
        ok: payload.ok,
        code: payload.ok ? undefined : payload.code,
        duration_ms: Date.now() - startedAt,
        user_id: userId,
        detail: payload.ok ? undefined : payload.detail,
      },
      payload.ok ? "info" : status >= 500 ? "error" : "warn",
    );
    return NextResponse.json(payload, { status });
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return respond(401, { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" });
  }
  userId = data.user.id;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return respond(400, { ok: false, code: "INVALID_JSON", message: "Invalid JSON body" });
  }

  const parsed = SaveMindmapRequestSchema.safeParse(json);
  if (!parsed.success) {
    return respond(400, { ok: false, code: "INVALID_BODY", message: "Invalid request body" });
  }

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,title,root_node_id")
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id)
    .maybeSingle();

  if (mindmapError) {
    return respond(500, {
      ok: false,
      code: "MINDMAP_LOAD_FAILED",
      message: "Failed to load mindmap",
      detail: mindmapError.message,
    });
  }
  if (!mindmap) {
    return respond(404, { ok: false, code: "MINDMAP_NOT_FOUND", message: "Mindmap not found" });
  }

  if (parsed.data.state.rootNodeId !== mindmap.root_node_id) {
    return respond(400, { ok: false, code: "ROOT_NODE_MISMATCH", message: "rootNodeId mismatch" });
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

  const { data: rpcData, error: rpcError } = await supabase.rpc("mma_replace_mindmap_nodes", {
    p_mindmap_id: mindmapId,
    p_root_node_id: mindmap.root_node_id,
    p_title: inferredTitle,
    p_nodes: rpcNodes,
    p_base_version: parsed.data.baseVersion,
  });

  if (rpcError) {
    if (isMissingAtomicSaveRpc(rpcError)) {
      return respond(503, {
        ok: false,
        code: "PERSISTENCE_UNAVAILABLE",
        message: "保存能力不可用：原子保存 RPC 缺失。请先应用 Supabase migrations。",
        detail: rpcError.message,
      });
    }

    return respond(500, {
      ok: false,
      code: "SAVE_FAILED",
      message: "Failed to save mindmap nodes",
      detail: rpcError.message,
    });
  }

  const normalized = rpcData as unknown;
  if (!normalized || typeof normalized !== "object" || !("ok" in normalized)) {
    return respond(500, {
      ok: false,
      code: "SAVE_FAILED",
      message: "Failed to save mindmap nodes",
      detail: "Invalid RPC response",
    });
  }

  if ((normalized as { ok: unknown }).ok === true) {
    const versionRaw = (normalized as { version?: unknown }).version;
    const version = typeof versionRaw === "string" ? Number(versionRaw) : versionRaw;
    if (typeof version !== "number" || !Number.isFinite(version) || version < 1) {
      return respond(500, {
        ok: false,
        code: "SAVE_FAILED",
        message: "Failed to save mindmap nodes",
        detail: "Invalid version returned from RPC",
      });
    }
    return respond(200, { ok: true, version });
  }

  const code = (normalized as { code?: unknown }).code;
  if (code === "VERSION_CONFLICT") {
    const versionRaw = (normalized as { version?: unknown }).version;
    const serverVersion = typeof versionRaw === "string" ? Number(versionRaw) : versionRaw;
    if (typeof serverVersion !== "number" || !Number.isFinite(serverVersion) || serverVersion < 1) {
      return respond(500, {
        ok: false,
        code: "SAVE_FAILED",
        message: "Failed to save mindmap nodes",
        detail: "Invalid serverVersion returned from RPC",
      });
    }
    return respond(409, {
      ok: false,
      code: "VERSION_CONFLICT",
      message: "检测到版本冲突，已阻止覆盖保存。",
      serverVersion,
    });
  }

  return respond(500, {
    ok: false,
    code: "SAVE_FAILED",
    message: "Failed to save mindmap nodes",
    detail: "Unknown RPC response",
  });
}
