import Link from "next/link";

export default function SecurityPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link className="text-sm underline" href="/">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">安全实践（MVP）</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">最后更新：2026-02-08</p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold tracking-tight">我们做了什么</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>通过登录态与行级权限（RLS）限制数据访问，仅所有者可读写私有导图与聊天记录。</li>
          <li>公开分享默认只读，且公开页不包含聊天记录与 AI ops。</li>
          <li>关键变更采用结构化 ops，便于回滚与审计。</li>
          <li>用量与限额通过服务端校验与计数，避免客户端绕过。</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">你可以做什么</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <ul className="list-disc space-y-2 pl-5">
            <li>不要在导图或对话中粘贴不应外泄的密钥/密码。</li>
            <li>若你生成了公开分享链接，请只发送给可信对象，并在不需要时及时停止分享。</li>
            <li>定期导出审计记录，保留自己的副本（JSON）。</li>
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">漏洞报告</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          如你发现安全问题，请避免在公开渠道披露敏感细节。可以通过仓库的 Security/Issues
          渠道联系我们。
        </div>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/trust">
          查看 Trust Center
        </Link>
        <Link className="underline" href="/privacy">
          查看隐私政策
        </Link>
      </div>
    </main>
  );
}
