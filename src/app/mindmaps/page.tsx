import { redirect } from "next/navigation";

import { MindmapsListClient } from "./MindmapsListClient";
import { SignOutButton } from "./SignOutButton";

import { listMindmapsPage } from "@/lib/mindmap/mindmapList";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">我的导图</h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">{data.user.email}</div>
        </div>
        <SignOutButton />
      </header>

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
