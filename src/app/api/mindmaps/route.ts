import { NextResponse, type NextRequest } from "next/server";

import { CreateMindmapRequestSchema } from "@/lib/mindmap/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: mindmaps, error: listError } = await supabase
    .from("mindmaps")
    .select("id,title,updated_at,is_public,public_slug")
    .eq("owner_id", data.user.id)
    .order("updated_at", { ascending: false });

  if (listError) {
    return jsonError(500, "Failed to list mindmaps", { detail: listError.message });
  }

  return NextResponse.json({
    ok: true,
    mindmaps:
      mindmaps?.map((m) => ({
        id: m.id,
        title: m.title,
        updatedAt: m.updated_at,
        isPublic: m.is_public,
        publicSlug: m.public_slug,
      })) ?? [],
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
