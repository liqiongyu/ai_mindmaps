import { notFound } from "next/navigation";

import { PublicMindmapViewer } from "./PublicMindmapViewer";

import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PublicMindmapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,title,root_node_id,updated_at")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (mindmapError) {
    notFound();
  }
  if (!mindmap) {
    notFound();
  }

  const { data: nodes, error: nodesError } = await supabase
    .from("mindmap_nodes")
    .select("id,parent_id,text,notes,order_index,pos_x,pos_y")
    .eq("mindmap_id", mindmap.id);

  if (nodesError) {
    notFound();
  }

  const state = nodeRowsToMindmapState(mindmap.root_node_id, nodes ?? []);

  return <PublicMindmapViewer state={state} title={mindmap.title} updatedAt={mindmap.updated_at} />;
}
