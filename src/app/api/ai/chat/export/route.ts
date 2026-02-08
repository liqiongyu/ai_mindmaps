import { NextResponse } from "next/server";

import { z } from "zod";

import { AiChatExportRequestSchema, AiChatExportResponseSchema } from "@/lib/ai/chat";
import { buildAiChatAuditExportFilename } from "@/lib/ai/chatExport";
import { OperationSchema } from "@/lib/mindmap/ops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logApi } from "@/lib/telemetry/apiLog";

function isMissingChatPersistenceSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

const ThreadRowSchema = z
  .object({
    id: z.string(),
    scope: z.enum(["global", "node"]),
    node_id: z.string().nullable(),
    created_at: z.string(),
  })
  .strict();

const MessageRowSchema = z
  .object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    operations: z.array(OperationSchema).nullable(),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    created_at: z.string(),
  })
  .strict();

export async function GET(request: Request) {
  const startedAt = Date.now();
  const route = "/api/ai/chat/export";
  const method = "GET";
  let userId: string | null = null;

  const respondOk = (payload: unknown, filename: string) => {
    logApi({
      type: "api",
      route,
      method,
      status: 200,
      ok: true,
      duration_ms: Date.now() - startedAt,
      user_id: userId,
    });

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  };

  const respondError = (
    status: number,
    code: string,
    message: string,
    extra?: Record<string, unknown>,
  ) => {
    logApi(
      {
        type: "api",
        route,
        method,
        status,
        ok: false,
        code,
        duration_ms: Date.now() - startedAt,
        user_id: userId,
        detail: typeof extra?.detail === "string" ? extra.detail : undefined,
      },
      status >= 500 ? "error" : "warn",
    );
    return NextResponse.json({ ok: false, code, message, ...extra }, { status });
  };

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return respondError(401, "UNAUTHORIZED", "Unauthorized");
  }
  userId = authData.user.id;

  const url = new URL(request.url);
  const parsedRequest = AiChatExportRequestSchema.safeParse({
    mindmapId: url.searchParams.get("mindmapId") ?? "",
    scope: url.searchParams.get("scope") ?? "",
    selectedNodeId: url.searchParams.get("selectedNodeId") ?? undefined,
  });

  if (!parsedRequest.success) {
    return respondError(400, "INVALID_QUERY", "Invalid request query", {
      issues: parsedRequest.error.issues,
    });
  }

  const { mindmapId, scope, selectedNodeId } = parsedRequest.data;

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id")
    .eq("id", mindmapId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (mindmapError) {
    return respondError(500, "MINDMAP_LOAD_FAILED", "Failed to load mindmap", {
      detail: mindmapError.message,
    });
  }
  if (!mindmap) {
    return respondError(404, "MINDMAP_NOT_FOUND", "Mindmap not found");
  }

  const threadQuery = supabase
    .from("chat_threads")
    .select("id,scope,node_id,created_at")
    .eq("mindmap_id", mindmapId)
    .eq("scope", scope);

  const threadResult =
    scope === "global"
      ? await threadQuery.is("node_id", null).maybeSingle()
      : await threadQuery.eq("node_id", selectedNodeId).maybeSingle();

  if (threadResult.error) {
    if (isMissingChatPersistenceSchema(threadResult.error)) {
      return respondError(501, "chat_persistence_unavailable", "Chat persistence unavailable");
    }
    return respondError(500, "CHAT_THREAD_LOAD_FAILED", "Failed to load chat thread", {
      detail: threadResult.error.message,
    });
  }

  if (!threadResult.data) {
    return respondError(404, "CHAT_THREAD_NOT_FOUND", "Chat thread not found");
  }

  const threadParsed = ThreadRowSchema.safeParse(threadResult.data);
  if (!threadParsed.success) {
    return respondError(500, "CHAT_THREAD_PARSE_FAILED", "Failed to parse chat thread");
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id,role,content,operations,provider,model,created_at")
    .eq("thread_id", threadParsed.data.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (messagesError) {
    if (isMissingChatPersistenceSchema(messagesError)) {
      return respondError(501, "chat_persistence_unavailable", "Chat persistence unavailable");
    }
    return respondError(500, "CHAT_MESSAGES_LOAD_FAILED", "Failed to load chat messages", {
      detail: messagesError.message,
    });
  }

  const messagesParsed = z.array(MessageRowSchema).safeParse(messageRows ?? []);
  if (!messagesParsed.success) {
    return respondError(500, "CHAT_MESSAGES_PARSE_FAILED", "Failed to parse chat messages");
  }

  const exportedAt = new Date().toISOString();
  const payload = {
    ok: true as const,
    version: "v1" as const,
    exportedAt,
    mindmapId,
    thread: {
      id: threadParsed.data.id,
      scope: threadParsed.data.scope,
      nodeId: threadParsed.data.node_id,
      createdAt: threadParsed.data.created_at,
    },
    messages: messagesParsed.data.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      operations: m.operations,
      provider: m.provider,
      model: m.model,
      createdAt: m.created_at,
    })),
  };

  const responseParsed = AiChatExportResponseSchema.safeParse(payload);
  if (!responseParsed.success) {
    return respondError(500, "EXPORT_PAYLOAD_INVALID", "Failed to build export payload");
  }

  const filename = buildAiChatAuditExportFilename({
    mindmapId,
    scope,
    selectedNodeId: scope === "node" ? selectedNodeId : null,
    exportedAt,
  });

  return respondOk(responseParsed.data, filename);
}
