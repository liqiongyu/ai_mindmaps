import { ImageResponse } from "next/og";
import { createElement } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

function toPlainText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase.rpc("mma_get_public_mindmap_snapshot", {
    p_slug: slug,
  });

  if (error) {
    return new Response("Not found", { status: 404 });
  }

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const requestedNodeId = url.searchParams.get("nodeId") ?? url.searchParams.get("node");

  const nodes = Array.isArray(row.nodes) ? row.nodes : [];
  const requestedNode =
    requestedNodeId && typeof requestedNodeId === "string"
      ? nodes.find(
          (n: unknown) =>
            n && typeof n === "object" && (n as { id?: unknown }).id === requestedNodeId,
        )
      : null;

  const title =
    typeof row.title === "string" && row.title.trim() ? row.title.trim() : "MindMaps AI";
  const subtitleRaw =
    requestedNode && typeof (requestedNode as { text?: unknown }).text === "string"
      ? String((requestedNode as { text?: unknown }).text)
      : "公开导图";
  const subtitle = clamp(toPlainText(subtitleRaw || "公开导图"), 64);

  const updatedAtRaw = typeof row.updated_at === "string" ? row.updated_at : "";
  const updatedLabel = updatedAtRaw ? `更新于 ${updatedAtRaw}` : "";

  const element = createElement(
    "div",
    {
      style: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #0b1020 0%, #0b0b0f 55%, #0c1118 100%)",
        color: "#ffffff",
      },
    },
    createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 18 } },
      createElement("div", { style: { fontSize: 20, opacity: 0.85 } }, "MindMaps AI · Public"),
      createElement("div", { style: { fontSize: 64, fontWeight: 700, lineHeight: 1.1 } }, title),
      createElement("div", { style: { fontSize: 30, opacity: 0.9 } }, subtitle),
    ),
    createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      createElement("div", { style: { fontSize: 20, opacity: 0.75 } }, updatedLabel),
      createElement(
        "div",
        {
          style: {
            fontSize: 18,
            opacity: 0.85,
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "10px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
          },
        },
        `/public/${slug}`,
      ),
    ),
  );

  return new ImageResponse(element, { width: 1200, height: 630 });
}
