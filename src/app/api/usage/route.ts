import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logApi } from "@/lib/telemetry/apiLog";
import { getUsageSummary } from "@/lib/usage/usageSummary";

export async function GET() {
  const startedAt = Date.now();
  const route = "/api/usage";
  const method = "GET";
  let userId: string | null = null;

  const respond = (
    status: number,
    payload:
      | {
          ok: true;
          planKey: string;
          upgradeUrl: string;
          period: { type: "day"; start: string; resetAt: string };
          metrics: {
            ai_chat: { used: number; limit: number | null };
            audit_export: { used: number; limit: number | null };
            public_shares: { used: number; limit: number | null };
          };
        }
      | { ok: false; code: string; message: string; detail?: string },
  ) => {
    logApi(
      {
        type: "api",
        route,
        method,
        status,
        ok: payload.ok,
        code: payload.ok ? undefined : payload.code,
        duration_ms: Date.now() - startedAt,
        user_id: userId,
        detail: payload.ok ? undefined : payload.detail,
      },
      payload.ok ? "info" : status >= 500 ? "error" : "warn",
    );
    return NextResponse.json(payload, { status });
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return respond(401, { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" });
  }
  userId = data.user.id;

  try {
    const summary = await getUsageSummary({ supabase, userId });
    return respond(200, summary);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return respond(500, {
      ok: false,
      code: "USAGE_LOAD_FAILED",
      message: "Failed to load usage",
      detail,
    });
  }
}
