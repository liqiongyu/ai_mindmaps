import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TelemetryIngestRequestSchema } from "@/lib/telemetry/schemas";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = TelemetryIngestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body", { issues: parsed.error.issues });
  }

  const { sessionId, events } = parsed.data;

  const path =
    parsed.data.path ??
    (() => {
      const referer = request.headers.get("referer");
      if (!referer) return null;
      try {
        return new URL(referer).pathname;
      } catch {
        return null;
      }
    })();

  const { error } = await supabase.rpc("mma_log_events", {
    p_session_id: sessionId,
    p_path: path,
    p_events: events.map((e) => ({
      name: e.name,
      createdAt: e.createdAt,
      properties: e.properties ?? {},
    })),
  });

  if (error) {
    return jsonError(500, "Failed to ingest telemetry events", { detail: error.message });
  }

  return NextResponse.json({ ok: true });
}
