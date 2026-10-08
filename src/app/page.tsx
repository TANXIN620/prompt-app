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
import { Modal } from "@/components/Modal";
import { useUIStore } from "@/store/ui-store";

type Dialog =
  | { kind: "none" }
  | { kind: "form"; editId: string | null }
  | { kind: "delete"; id: string; title: string }
  | { kind: "import" }
  | { kind: "detail" };

/** 检测窄屏（< 768px）——手机竖屏等场景 */
function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setNarrow(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isNarrow = useIsNarrow();
  // 左右栏宽度（可拖拽分隔条调节；窄屏时左栏收缩，右栏隐藏）
  const [leftW, setLeftW] = useState(240);
  const [rightW, setRightW] = useState(360);
  const closeDetail = () => {
    setDialog({ kind: "none" });
    useUIStore.getState().selectPrompt(null);
  };

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

  // 窄屏：选中卡片后自动弹出详情 Modal
  const selectedPromptId = useUIStore((s) => s.selectedPromptId);
  useEffect(() => {
    if (!isNarrow) return;
    if (selectedPromptId && dialog.kind === "none") {
      setDialog({ kind: "detail" });
    }
  }, [isNarrow, selectedPromptId, dialog.kind]);

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
      <main className="flex flex-1 min-h-0">
        <aside
          style={{ width: isNarrow ? 180 : leftW }}
          className="min-h-0 shrink-0 overflow-hidden bg-surface"
        >
          <CategoryTree />
        </aside>
        {!isNarrow && (
          <Resizer
            onResize={(dx) =>
              setLeftW((w) => Math.min(560, Math.max(180, w + dx)))
            }
          />
        )}
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-surface">
          <PromptListPane />
        </section>
        {!isNarrow && (
          <>
            <Resizer
              onResize={(dx) =>
                setRightW((w) => Math.min(640, Math.max(300, w - dx)))
              }
            />
            <aside
              style={{ width: rightW }}
              className="min-h-0 shrink-0 overflow-hidden bg-surface"
            >
              <PromptDetailPane
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </aside>
          </>
        )}
      </main>

      {/* 窄屏：详情弹出式 Modal */}
      {isNarrow && selectedPromptId && dialog.kind === "detail" && (
        <Modal open onClose={closeDetail} size="full" title="">
          <div className="h-full">
            <PromptDetailPane
              onEdit={handleEdit}
              onDelete={(id, title) => {
                closeDetail();
                handleDelete(id, title);
              }}
            />
          </div>
        </Modal>
      )}

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

/**
 * 可拖拽的竖向分隔条。
 * onResize 接收每帧鼠标 x 位移（dx>0 向右），由父组件决定如何调整宽度。
 */
function Resizer({ onResize }: { onResize: (dx: number) => void }) {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const startX = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX.current;
      startX.current = e.clientX;
      onResizeRef.current(dx);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        startX.current = e.clientX;
        setDragging(true);
      }}
      className="group relative w-1 shrink-0 cursor-col-resize bg-line/60 transition-colors hover:bg-brand/50"
      title="拖动以调整栏宽"
    >
      {/* 加宽的不可见热区，方便鼠标命中 */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}
