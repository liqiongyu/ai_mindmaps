import Link from "next/link";

export default function TrustPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link className="text-sm underline" href="/">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Trust Center（MVP）</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          隐私、安全、数据控制与审计导出入口。最后更新：2026-02-08
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Link
          className="rounded-lg border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          href="/privacy"
        >
          <div className="text-sm font-semibold tracking-tight">隐私政策</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            了解我们如何处理导图、对话与用量数据。
          </div>
        </Link>
        <Link
          className="rounded-lg border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          href="/security"
        >
          <div className="text-sm font-semibold tracking-tight">安全实践</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            了解权限边界、公开分享范围与安全建议。
          </div>
        </Link>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold tracking-tight">核心口径</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>默认不将你的导图与对话用于模型训练。</li>
          <li>你可以随时删除数据与分享链接。</li>
          <li>审计导出仅对导图所有者开放。</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">数据控制（可执行、可验证）</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <span className="font-medium text-zinc-700 dark:text-zinc-200">删除导图：</span>在{" "}
              <Link className="underline" href="/mindmaps">
                我的导图
              </Link>{" "}
              列表点击“删除”，或在编辑器右上角“⋯”菜单中选择“删除导图”。删除后该导图将无法再被访问或导出。
            </li>
            <li>
              <span className="font-medium text-zinc-700 dark:text-zinc-200">停止分享：</span>
              在编辑器点击“分享”打开面板，选择“停止分享”。停止后旧公开链接将返回不可用。
            </li>
            <li>
              <span className="font-medium text-zinc-700 dark:text-zinc-200">导出审计记录：</span>
              在编辑器右侧 AI 面板点击“导出”，会导出当前会话的 JSON（包含时间、provider/model 与
              ops）。
            </li>
          </ol>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">常见问题</h2>
        <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          <details className="group rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <summary className="cursor-pointer font-medium select-none">
              公开分享会暴露聊天记录吗？
            </summary>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              不会。公开页仅展示导图内容（只读），不会展示聊天记录与 AI ops。
            </div>
          </details>
          <details className="group rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <summary className="cursor-pointer font-medium select-none">
              导出审计记录包含什么？
            </summary>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              包含导图 ID、会话范围（全局/节点）、消息时间、provider/model，以及（对 assistant
              消息）对应的 ops。
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
