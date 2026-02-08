import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">套餐与用量</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          升级能力建设中。当前默认套餐为 Free，可在此查看用量上限与后续升级入口。
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Free</div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">默认套餐</div>
          </div>
          <div className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
            当前可用
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div>AI 调用：100 / 天</div>
          <div>导出：50 / 天</div>
          <div>公开分享：10（当前公开数量上限）</div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">升级</div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          如需更高用量与更多能力，请稍后再来（或联系管理员开通）。
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          href="/mindmaps"
        >
          回到我的导图
        </Link>
      </div>
    </main>
  );
}
