import { z } from "zod";

import { getPeriodResetAtUtcIso, getPeriodStartUtcDateString, type MeteredPeriod } from "./period";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type QuotaMetric = "ai_chat" | "audit_export";

export type QuotaConsumeResult =
  | {
      ok: true;
      enforced: boolean;
      metric: QuotaMetric;
      plan: string;
      period: MeteredPeriod;
      periodStart: string;
      used: number;
      limit: number | null;
      resetAt: string | null;
    }
  | {
      ok: false;
      enforced: true;
      metric: QuotaMetric;
      plan: string;
      period: MeteredPeriod;
      periodStart: string;
      used: number;
      limit: number;
      resetAt: string | null;
    };

const ConsumeQuotaRowSchema = z
  .object({
    ok: z.boolean(),
    metric: z.string(),
    plan: z.string(),
    period: z.string(),
    period_start: z.string(),
    used: z.number(),
    limit: z.number().nullable(),
    reset_at: z.string().nullable(),
  })
  .strict();

function isMissingQuotaRpc(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST202") return true;
  return /could not find the function/i.test(error.message);
}

function isMissingQuotaSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

export async function consumeQuota(args: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  metric: QuotaMetric;
  plan: string;
  period: MeteredPeriod;
  amount: number;
}): Promise<QuotaConsumeResult> {
  const { supabase, metric, plan, period, amount } = args;

  const { data, error } = await supabase.rpc("mma_consume_quota", {
    p_metric: metric,
    p_plan: plan,
    p_period: period,
    p_amount: amount,
  });

  if (error) {
    if (isMissingQuotaRpc(error) || isMissingQuotaSchema(error)) {
      const now = new Date();
      return {
        ok: true,
        enforced: false,
        metric,
        plan,
        period,
        periodStart: getPeriodStartUtcDateString(period, now),
        used: 0,
        limit: null,
        resetAt: getPeriodResetAtUtcIso(period, now),
      };
    }
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = ConsumeQuotaRowSchema.safeParse(row);
  if (!parsed.success) {
    throw new Error("Invalid quota response");
  }

  const base = {
    enforced: true as const,
    metric: metric,
    plan,
    period,
    periodStart: parsed.data.period_start,
    used: parsed.data.used,
    resetAt: parsed.data.reset_at ?? null,
  };

  if (!parsed.data.ok) {
    return {
      ...base,
      ok: false,
      limit: parsed.data.limit ?? 0,
    };
  }

  return {
    ...base,
    ok: true,
    limit: parsed.data.limit,
  };
}
