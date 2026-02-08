import { redirect } from "next/navigation";

import { MindmapsListClient } from "./MindmapsListClient";
import { SignOutButton } from "./SignOutButton";

import { listMindmapsPage } from "@/lib/mindmap/mindmapList";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUsageSummary, type UsageSummary } from "@/lib/usage/usageSummary";

export default async function MindmapsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const qParam = searchParams?.q;
  const q = Array.isArray(qParam) ? qParam[0] : qParam;

  const listResult = await listMindmapsPage({
    supabase,
    userId: data.user.id,
    limit: 20,
    q: q ?? null,
  });

  let usageSummary: UsageSummary | null = null;
  let usageError: string | null = null;
  try {
    usageSummary = await getUsageSummary({ supabase, userId: data.user.id });
  } catch (err) {
    usageError = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">我的导图</h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">{data.user.email}</div>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">账户用量</div>
            <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
              AI/审计导出按天重置；公开分享为当前公开数量。（PNG/SVG 导出不计入审计导出）
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              href={usageSummary?.upgradeUrl ?? "/pricing"}
            >
              查看套餐
            </a>
            <a
              className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              href={usageSummary?.upgradeUrl ?? "/pricing"}
            >
              升级
            </a>
          </div>
        </div>

        {usageError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
            用量加载失败：{usageError}
          </div>
        ) : usageSummary ? (
          <div className="mt-4 grid gap-2 text-sm">
            <div>
              AI 调用：{usageSummary.metrics.ai_chat.used} /{" "}
              {usageSummary.metrics.ai_chat.limit ?? "∞"}
            </div>
            <div>
              审计导出(JSON)：{usageSummary.metrics.audit_export.used} /{" "}
              {usageSummary.metrics.audit_export.limit ?? "∞"}
            </div>
            <div>
              公开分享：{usageSummary.metrics.public_shares.used} /{" "}
              {usageSummary.metrics.public_shares.limit ?? "∞"}
            </div>
          </div>
        ) : null}
      </section>

      {!listResult.ok ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
          加载失败：{listResult.message}
        </div>
      ) : (
        <MindmapsListClient
          initialItems={listResult.items}
          initialNextCursor={listResult.nextCursor}
          initialQuery={q ?? ""}
          initialTotal={listResult.total}
        />
      )}
    </main>
  );
}
