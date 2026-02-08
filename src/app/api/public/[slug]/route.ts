import { NextResponse } from "next/server";

import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase.rpc("mma_get_public_mindmap_snapshot", {
    p_slug: slug,
  });

  if (error) {
    return jsonError(500, "Failed to load public mindmap", { detail: error.message });
  }

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    return jsonError(404, "Mindmap not found");
  }

  const nodes = Array.isArray(row.nodes) ? row.nodes : [];
  const state = nodeRowsToMindmapState(row.root_node_id, nodes);

  return NextResponse.json({
    ok: true,
    mindmap: {
      title: row.title,
      rootNodeId: row.root_node_id,
      updatedAt: row.updated_at,
    },
    state,
  });
}
