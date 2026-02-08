import { notFound } from "next/navigation";

import { PublicMindmapViewer } from "./PublicMindmapViewer";

import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PublicMindmapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase.rpc("mma_get_public_mindmap_snapshot", {
    p_slug: slug,
  });

  if (error) {
    notFound();
  }

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    notFound();
  }

  const nodes = Array.isArray(row.nodes) ? row.nodes : [];
  const state = nodeRowsToMindmapState(row.root_node_id, nodes);

  return <PublicMindmapViewer state={state} title={row.title} updatedAt={row.updated_at} />;
}
