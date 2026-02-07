import { NextResponse } from "next/server";

import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,title,root_node_id,updated_at")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (mindmapError) {
    return jsonError(500, "Failed to load public mindmap", { detail: mindmapError.message });
  }
  if (!mindmap) {
    return jsonError(404, "Mindmap not found");
  }

  const { data: nodes, error: nodesError } = await supabase
    .from("mindmap_nodes")
    .select("id,parent_id,text,notes,order_index")
    .eq("mindmap_id", mindmap.id);

  if (nodesError) {
    return jsonError(500, "Failed to load mindmap nodes", { detail: nodesError.message });
  }

  const state = nodeRowsToMindmapState(mindmap.root_node_id, nodes ?? []);

  return NextResponse.json({
    ok: true,
    mindmap: {
      id: mindmap.id,
      title: mindmap.title,
      rootNodeId: mindmap.root_node_id,
      updatedAt: mindmap.updated_at,
    },
    state,
  });
}
