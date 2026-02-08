"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { uiFeedback } from "@/lib/ui/feedback";

type TemplateListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
};

type TemplatesResponse = {
  ok: true;
  items: TemplateListItem[];
};

type CreateMindmapResponse =
  | { ok: true; mindmapId: string; rootNodeId?: string }
  | { ok: false; message?: string; detail?: string };

function getErrorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const record = json as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.detail === "string" && record.detail.trim()) return record.detail;
  return fallback;
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function MindmapsNewClient() {
  const router = useRouter();

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [aiTitle, setAiTitle] = useState("");
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  const templatesByCategory = useMemo(() => {
    const groups = new Map<string, TemplateListItem[]>();
    for (const template of templates) {
      const key = template.category?.trim() || "其他";
      const existing = groups.get(key);
      if (existing) existing.push(template);
      else groups.set(key, [template]);
    }
    return Array.from(groups.entries());
  }, [templates]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTemplates(true);
    setTemplatesError(null);

    void fetch("/api/templates")
      .then(async (res) => {
        const json = await parseJson(res);
        if (
          !res.ok ||
          !json ||
          typeof json !== "object" ||
          (json as { ok?: unknown }).ok !== true
        ) {
          const message = getErrorMessage(json, `加载模板失败（${res.status}）`);
          throw new Error(message);
        }
        const payload = json as TemplatesResponse;
        if (!Array.isArray(payload.items)) {
          throw new Error("模板响应格式错误");
        }
        if (cancelled) return;
        setTemplates(payload.items);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "加载模板失败";
        setTemplatesError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingTemplates(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const createMindmap = async (body: Record<string, unknown>, key: string) => {
    setCreatingKey(key);
    try {
      const res = await fetch("/api/mindmaps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await parseJson(res)) as CreateMindmapResponse | null;

      if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
        const message = getErrorMessage(json, `创建失败（${res.status}）`);
        if (res.status === 401) {
          uiFeedback.enqueue({
            type: "error",
            title: "登录已过期",
            message: "请重新登录后再试。",
            actions: [{ label: "去登录", onClick: () => router.push("/login?next=/mindmaps/new") }],
          });
        }
        throw new Error(message);
      }

      router.push(`/mindmaps/${json.mindmapId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      uiFeedback.enqueue({ type: "error", message });
    } finally {
      setCreatingKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-base font-medium">从空白开始</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            适合自由发挥，进入后可随时使用 AI 改图。
          </div>
          <button
            className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            disabled={creatingKey !== null}
            onClick={() => void createMindmap({}, "blank")}
            type="button"
          >
            {creatingKey === "blank" ? "创建中…" : "创建空白导图"}
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-base font-medium">一句话开局</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            用一句话作为根节点标题，进入后可继续让 AI 扩展结构。
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-300" htmlFor="mindmaps-new-ai">
              标题
            </label>
            <input
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-600"
              id="mindmaps-new-ai"
              onChange={(event) => setAiTitle(event.target.value)}
              placeholder="例如：2026 Q1 学习路线"
              value={aiTitle}
            />
            <button
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={creatingKey !== null || !aiTitle.trim()}
              onClick={() => void createMindmap({ title: aiTitle.trim() }, "ai")}
              type="button"
            >
              {creatingKey === "ai" ? "创建中…" : "创建并进入"}
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-medium">从模板创建</h2>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">选择一个场景化起点</div>
        </div>

        {loadingTemplates ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                className="h-[92px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30"
                key={idx}
              />
            ))}
          </div>
        ) : templatesError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
            加载模板失败：{templatesError}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200">
            暂无模板。
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {templatesByCategory.map(([category, items]) => (
              <div className="flex flex-col gap-3" key={category}>
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {category}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items.map((template) => (
                    <button
                      className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      disabled={creatingKey !== null}
                      key={template.id}
                      onClick={() => void createMindmap({ templateId: template.id }, template.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-medium">{template.title}</div>
                          {template.description ? (
                            <div className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                              {template.description}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
                          模板
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {creatingKey === template.id ? "创建中…" : "点击创建并进入编辑器"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
