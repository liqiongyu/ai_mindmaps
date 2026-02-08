import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link className="text-sm underline" href="/">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">隐私政策（MVP）</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">最后更新：2026-02-08</p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold tracking-tight">核心承诺</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>默认不将你的导图与对话用于模型训练。</li>
          <li>你可以随时删除数据与分享链接。</li>
          <li>公开分享页面仅展示你明确公开的导图内容，不包含聊天记录与 AI ops。</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">我们收集哪些数据</h2>
        <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-200">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium">账户与身份</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              用于登录与识别你的账户（例如邮箱、用户 ID）。
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium">导图数据</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              你创建/编辑的导图标题、节点文本与结构、位置信息等，用于提供导图编辑、保存、分享与导出。
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium">聊天与审计记录</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              当你在导图中使用 AI 对话时，系统会保存会话消息与 AI 产生的 ops，以支持回看与审计导出。
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium">基础运行日志与用量</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              为了保障稳定性与用量控制，我们可能记录必要的接口调用与计数信息（不包含公开分享内容以外的访问者身份信息）。
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">数据保留与删除</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          <ul className="list-disc space-y-2 pl-5">
            <li>我们默认保留你的数据，直到你主动删除。</li>
            <li>
              删除导图会级联删除其节点数据、聊天/审计记录与公开分享信息（如有），此操作不可恢复。
            </li>
            <li>停止分享后，旧的公开链接将无法访问。</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="underline" href="/mindmaps">
              去“我的导图”删除导图
            </Link>
            <Link className="underline" href="/trust">
              查看 Trust Center
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">第三方处理</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          当你使用 AI
          功能时，你的输入与必要的上下文会发送给模型服务提供方用于生成结果。我们会尽量限制发送范围，并
          避免在响应中暴露不必要的敏感信息。
        </div>
      </section>
    </main>
  );
}
