import { NextResponse } from "next/server";

import { z } from "zod";

import { nodeRowsToMindmapState } from "@/lib/mindmap/storage";
import { MindmapViewportSchema } from "@/lib/mindmap/uiState";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingUiStateSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

function isMissingChatPersistenceSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

const MindmapUiStateRowSchema = z.object({
  collapsed_node_ids: z.array(z.string()).nullable(),
  selected_node_id: z.string().nullable(),
  viewport: z.unknown().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,title,root_node_id,updated_at,is_public,public_slug,version")
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id)
    .maybeSingle();

  if (mindmapError) {
    return jsonError(500, "Failed to load mindmap", { detail: mindmapError.message });
  }
  if (!mindmap) {
    return jsonError(404, "Mindmap not found");
  }

  const { data: nodes, error: nodesError } = await supabase
    .from("mindmap_nodes")
    .select("id,parent_id,text,notes,order_index,pos_x,pos_y")
    .eq("mindmap_id", mindmapId);

  if (nodesError) {
    return jsonError(500, "Failed to load mindmap nodes", { detail: nodesError.message });
  }

  const state = nodeRowsToMindmapState(mindmap.root_node_id, nodes ?? []);
  const nodeIds = new Set((nodes ?? []).map((node) => node.id));

  const persistence = {
    chat: true,
    uiState: true,
  };

  const { error: chatSchemaError } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("mindmap_id", mindmapId)
    .limit(1);

  if (chatSchemaError) {
    if (isMissingChatPersistenceSchema(chatSchemaError)) {
      persistence.chat = false;
    } else {
      console.error("Failed to check chat persistence", { mindmapId, error: chatSchemaError });
      persistence.chat = false;
    }
  }

  let ui: {
    collapsedNodeIds: string[];
    selectedNodeId: string | null;
    viewport: z.infer<typeof MindmapViewportSchema> | null;
  } | null = null;

  const { data: uiRowRaw, error: uiError } = await supabase
    .from("mindmap_ui_state")
    .select("collapsed_node_ids,selected_node_id,viewport")
    .eq("mindmap_id", mindmapId)
    .maybeSingle();

  if (uiError) {
    if (!isMissingUiStateSchema(uiError)) {
      return jsonError(500, "Failed to load mindmap UI state", { detail: uiError.message });
    }
    persistence.uiState = false;
  } else {
    const uiRow = MindmapUiStateRowSchema.safeParse(uiRowRaw);
    if (uiRow.success && uiRow.data) {
      const collapsedNodeIds = (uiRow.data.collapsed_node_ids ?? []).filter((id) =>
        nodeIds.has(id),
      );
      const selectedNodeId =
        uiRow.data.selected_node_id && nodeIds.has(uiRow.data.selected_node_id)
          ? uiRow.data.selected_node_id
          : null;
      const viewportParsed = MindmapViewportSchema.nullable().safeParse(uiRow.data.viewport);
      ui = {
        collapsedNodeIds,
        selectedNodeId,
        viewport: viewportParsed.success ? viewportParsed.data : null,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    mindmap: {
      id: mindmap.id,
      title: mindmap.title,
      rootNodeId: mindmap.root_node_id,
      updatedAt: mindmap.updated_at,
      isPublic: mindmap.is_public,
      publicSlug: mindmap.public_slug,
      version: mindmap.version,
    },
    ui,
    state,
    persistence,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("mindmaps")
    .delete()
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return jsonError(500, "Failed to delete mindmap", { detail: deleteError.message });
  }
  if (!deleted) {
    return jsonError(404, "Mindmap not found");
  }

  return NextResponse.json({ ok: true });
}
