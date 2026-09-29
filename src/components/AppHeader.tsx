"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Plus, Upload, Download } from "lucide-react";
import { getDB } from "@/lib/db";
import { Button } from "./ui";

export function AppHeader({
  onNew,
  onImport,
  onExport,
}: {
  onNew?: () => void;
  onImport?: () => void;
  onExport?: () => void;
}) {
  const stats = useLiveQuery(async () => {
    const all = await getDB().prompts.toArray();
    return {
      total: all.length,
      fav: all.filter((p) => p.favorite).length,
    };
  }, []);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 h-14 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-text shrink-0">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight truncate">
            图像提示词管理台
          </h1>
          <p className="text-[11px] text-muted leading-tight truncate">
            共 {stats?.total ?? "—"} 条 · 收藏 {stats?.fav ?? "—"} · 本地存储
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onImport}>
          <Upload className="h-3.5 w-3.5" />
          批量导入
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} title="导出 JSON">
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="primary" size="sm" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />
          新建
        </Button>
      </div>
    </header>
  );
}
