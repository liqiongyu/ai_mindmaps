import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type DailyFunnelRow = {
  day: string;
  sessions: number;
  landing_cta_click: number;
  try_opened: number;
  editor_opened: number;
  ai_request_sent: number;
  ai_ops_applied: number;
  mindmap_saved: number;
  export_succeeded: number;
  share_link_generated: number;
};

export default async function MetricsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect("/login?next=/metrics");
  }

  const { data, error } = await supabase.rpc("mma_get_daily_funnel", { p_days: 14 });
  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-lg font-semibold">Metrics</h1>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load metrics: {error.message}
        </div>
      </div>
    );
  }

  const rows = (Array.isArray(data) ? data : []) as DailyFunnelRow[];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Metrics</h1>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Daily funnel (last 14 days, session-based)
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Day</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Sessions</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Landing CTA</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Try Opened</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Editor Opened</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">AI Sent</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">AI Applied</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Saved</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Export</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Share Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600 dark:text-zinc-300" colSpan={10}>
                  No data yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.day}>
                  <td className="px-4 py-3 whitespace-nowrap">{row.day}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.sessions}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.landing_cta_click}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.try_opened}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.editor_opened}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.ai_request_sent}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.ai_ops_applied}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.mindmap_saved}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.export_succeeded}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.share_link_generated}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
