import { MindmapCanvas } from "./MindmapCanvas";

import { sampleMindmapState } from "@/lib/mindmap/sample";

export default async function MindmapEditorPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="text-sm font-medium">MindMaps AI</div>
        <div className="text-xs text-zinc-500">Demo editor (no persistence yet)</div>
      </header>
      <MindmapCanvas state={sampleMindmapState} />
    </main>
  );
}
