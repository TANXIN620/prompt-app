"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Plus, Upload, Download, RefreshCw, Cloud } from "lucide-react";
import { getDB } from "@/lib/db";
import { isCloudEnabled } from "@/lib/supabase";
import { syncAll } from "@/lib/sync";
import { cn } from "@/lib/utils";
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
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  // 避免服务端渲染（无 window）与客户端 hydration 不一致
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showCloud = mounted && isCloudEnabled;

  const stats = useLiveQuery(async () => {
    const all = await getDB().prompts.toArray();
    return {
      total: all.length,
      fav: all.filter((p) => p.favorite).length,
    };
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await syncAll();
      setSyncMsg(r.message);
      setTimeout(() => setSyncMsg(null), 3000);
    } finally {
      setSyncing(false);
    }
  }

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
            共 {stats?.total ?? "—"} 条 · 收藏 {stats?.fav ?? "—"}
            {showCloud ? " · 云端同步" : " · 本地存储"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showCloud && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            title={syncMsg ?? "从云端拉取并推送本地"}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            <Cloud className="h-3 w-3" />
          </Button>
        )}
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
      {syncMsg && (
        <div className="absolute top-16 right-4 z-40 rounded-lg border border-line bg-surface px-3 py-1.5 text-[11px] text-foreground shadow-lg">
          {syncMsg}
        </div>
      )}
    </header>
  );
}
