import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { getPlanKeyFromEnv, getUpgradeUrlFromEnv } from "./plan";
import { getPeriodResetAtUtcIso, getPeriodStartUtcDateString } from "./period";

export type UsageMetricSummary = {
  used: number;
  limit: number | null;
};

export type UsageSummary = {
  ok: true;
  planKey: string;
  upgradeUrl: string;
  period: { type: "day"; start: string; resetAt: string };
  metrics: {
    ai_chat: UsageMetricSummary;
    audit_export: UsageMetricSummary;
    public_shares: UsageMetricSummary;
  };
};

function isMissingTable(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

export async function getUsageSummary(args: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  now?: Date;
}): Promise<UsageSummary> {
  const { supabase, userId, now = new Date() } = args;
  const planKey = getPlanKeyFromEnv();
  const upgradeUrl = getUpgradeUrlFromEnv();

  const periodStart = getPeriodStartUtcDateString("day", now);
  const resetAt = getPeriodResetAtUtcIso("day", now);

  const getCounter = async (metric: "ai_chat" | "audit_export"): Promise<number> => {
    const { data, error } = await supabase
      .from("usage_counters")
      .select("used")
      .eq("owner_id", userId)
      .eq("metric", metric)
      .eq("period", "day")
      .eq("period_start", periodStart)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return 0;
      throw new Error(error.message);
    }

    if (!data || typeof (data as { used?: unknown }).used !== "number") return 0;
    return (data as { used: number }).used;
  };

  const getLimit = async (metric: string, period: string): Promise<number | null> => {
    const { data, error } = await supabase
      .from("plan_limits")
      .select("limit,is_enabled")
      .eq("plan", planKey)
      .eq("metric", metric)
      .eq("period", period)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return null;
      throw new Error(error.message);
    }

    const record = data as null | { limit?: unknown; is_enabled?: unknown };
    if (!record) return null;
    if (record.is_enabled !== true) return null;
    if (record.limit === null) return null;
    return typeof record.limit === "number" ? record.limit : null;
  };

  const { count: sharesCount, error: sharesError } = await supabase
    .from("mindmaps")
    .select("id", { count: "exact" })
    .eq("owner_id", userId)
    .eq("is_public", true)
    .limit(1);

  if (sharesError) {
    throw new Error(sharesError.message);
  }

  const aiUsed = await getCounter("ai_chat");
  const exportUsed = await getCounter("audit_export");
  const sharesUsed = typeof sharesCount === "number" ? sharesCount : 0;

  const aiLimit = await getLimit("ai_chat", "day");
  const exportLimit = await getLimit("audit_export", "day");
  const sharesLimit = await getLimit("public_shares", "active");

  return {
    ok: true,
    planKey,
    upgradeUrl,
    period: { type: "day", start: periodStart, resetAt },
    metrics: {
      ai_chat: { used: aiUsed, limit: aiLimit },
      audit_export: { used: exportUsed, limit: exportLimit },
      public_shares: { used: sharesUsed, limit: sharesLimit },
    },
  };
}
