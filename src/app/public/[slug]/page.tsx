import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicMindmapViewer } from "./PublicMindmapViewer";

import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase.rpc("mma_get_public_mindmap_snapshot", {
    p_slug: slug,
  });

  const row = !error && Array.isArray(rows) ? rows[0] : null;
  const title = row?.title ? `${row.title}` : "MindMaps AI";
  const description = row?.title ? `公开导图：${row.title}` : "公开导图（只读）";
  const ogImageUrl = `/api/og/public/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

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
