"use client";

import { useEffect, useRef, useState } from "react";
import { initDB, getDB } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { CategoryTree } from "@/components/CategoryTree";
import { PromptListPane } from "@/components/PromptListPane";
import { PromptDetailPane } from "@/components/PromptDetailPane";
import { PromptFormDialog } from "@/components/PromptFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { BatchImportDialog } from "@/components/BatchImportDialog";
import { CategoryManageDialog } from "@/components/CategoryManageDialog";

type Dialog =
  | { kind: "none" }
  | { kind: "form"; editId: string | null }
  | { kind: "delete"; id: string; title: string }
  | { kind: "import" };

export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDB();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ctrl/Cmd + K 聚焦搜索框
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = searchInputRef.current ?? document.querySelector<HTMLInputElement>(
          'input[placeholder^="搜索"]',
        );
        if (el) {
          el.focus();
          el.select();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 导出全部数据为 JSON
  async function exportJSON() {
    const db = getDB();
    const [categories, tags, prompts] = await Promise.all([
      db.categories.toArray(),
      db.tags.toArray(),
      db.prompts.toArray(),
    ]);
    const blob = new Blob(
      [JSON.stringify({ version: 1, categories, tags, prompts }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompts-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleNew() {
    setDialog({ kind: "form", editId: null });
  }
  function handleEdit(id: string) {
    setDialog({ kind: "form", editId: id });
  }
  function handleDelete(id: string, title: string) {
    setDialog({ kind: "delete", id, title });
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader
        onNew={handleNew}
        onImport={() => setDialog({ kind: "import" })}
        onExport={exportJSON}
      />
      {error && (
        <div className="border-b border-red-300/40 bg-red-500/10 px-4 py-1.5 text-[11px] text-red-600 dark:text-red-400">
          数据库初始化失败：{error}
        </div>
      )}
      <main className="grid flex-1 min-h-0 grid-cols-[210px_minmax(0,1fr)_340px] divide-x divide-line">
        <aside className="min-h-0 overflow-hidden bg-surface">
          <CategoryTree />
        </aside>
        <section className="min-h-0 overflow-hidden bg-surface">
          <PromptListPane />
        </section>
        <aside className="min-h-0 overflow-hidden bg-surface">
          <PromptDetailPane
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </aside>
      </main>

      {/* 弹窗群 */}
      <PromptFormDialog
        open={dialog.kind === "form"}
        editId={dialog.kind === "form" ? dialog.editId : null}
        onClose={() => setDialog({ kind: "none" })}
      />
      <DeleteConfirmDialog
        open={dialog.kind === "delete"}
        promptId={dialog.kind === "delete" ? dialog.id : null}
        promptTitle={dialog.kind === "delete" ? dialog.title : ""}
        onClose={() => setDialog({ kind: "none" })}
      />
      <BatchImportDialog
        open={dialog.kind === "import"}
        onClose={() => setDialog({ kind: "none" })}
      />
      <CategoryManageDialog />
    </div>
  );
}
