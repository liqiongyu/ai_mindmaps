import { NextResponse } from "next/server";

import { getMindmapNodeBreadcrumb } from "@/lib/mindmap/breadcrumb";
import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase.rpc("mma_get_public_mindmap_snapshot", {
    p_slug: slug,
  });

  if (error) {
    console.error("Failed to load public mindmap snapshot", {
      slug,
      error,
    });
    return jsonError(500, "Failed to load public mindmap");
  }

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    return jsonError(404, "Mindmap not found");
  }

  const nodes = Array.isArray(row.nodes) ? row.nodes : [];
  const state = nodeRowsToMindmapState(row.root_node_id, nodes);

  const url = new URL(request.url);
  const requestedNodeId = url.searchParams.get("nodeId") ?? url.searchParams.get("node");
  const focusedNode = requestedNodeId ? state.nodesById[requestedNodeId] : null;
  const breadcrumb = focusedNode ? getMindmapNodeBreadcrumb(state, focusedNode.id) : null;

  return NextResponse.json({
    ok: true,
    mindmap: {
      title: row.title,
      rootNodeId: row.root_node_id,
      updatedAt: row.updated_at,
    },
    state,
    focusedNode: focusedNode
      ? {
          id: focusedNode.id,
          text: focusedNode.text,
          notes: focusedNode.notes,
          breadcrumb,
        }
      : null,
  });
}
