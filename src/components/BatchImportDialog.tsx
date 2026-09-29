"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardPaste, FileUp, Upload, Check } from "lucide-react";
import { getDB } from "@/lib/db";
import type { Prompt } from "@/lib/types";
import {
  dedupeDrafts,
  parseImportText,
  SAMPLE_IMPORT,
} from "@/lib/importer";
import { cn } from "@/lib/utils";
import { Badge, Button } from "./ui";
import { Field, inputCls, Modal } from "./Modal";

type Mode = "paste" | "json";

export function BatchImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const cats = useLiveQuery(() => getDB().categories.toArray(), []);
  const [raw, setRaw] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [imported, setImported] = useState<{ added: number; dup: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const { topCats, subByParent } = useMemo(() => {
    const top = (cats ?? [])
      .filter((c) => c.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const sub: Record<string, typeof cats> = {};
    for (const c of cats ?? []) {
      if (c.parentId) (sub[c.parentId] ??= []).push(c);
    }
    for (const k of Object.keys(sub)) {
      const arr = sub[k];
      if (arr) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return { topCats: top, subByParent: sub };
  }, [cats]);

  const drafts = useMemo(() => parseImportText(raw), [raw]);
  const { unique, duplicates } = useMemo(
    () => dedupeDrafts(drafts),
    [drafts],
  );

  function reset() {
    setRaw("");
    setCategoryId("");
    setSubcategoryId("");
    setImported(null);
    setMode("paste");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRaw(text);
    } catch {
      // 剪贴板权限被拒，提示用户手动粘贴
      alert("无法读取剪贴板，请手动粘贴（Ctrl/Cmd + V）");
    }
  }

  async function handleJSONFile(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      let data: {
        categories?: unknown[];
        tags?: unknown[];
        prompts?: unknown[];
      };
      try {
        data = JSON.parse(text);
      } catch {
        alert("JSON 文件格式不正确");
        return;
      }
      if (!data.prompts || !Array.isArray(data.prompts)) {
        alert("文件缺少 prompts 字段");
        return;
      }
      const db = getDB();
      await db.transaction(
        "rw",
        db.categories,
        db.tags,
        db.prompts,
        async () => {
          if (data.categories?.length)
            await db.categories.bulkPut(data.categories as never);
          if (data.tags?.length)
            await db.tags.bulkPut(data.tags as never);
          await db.prompts.bulkPut(data.prompts as never);
        },
      );
      setImported({ added: data.prompts.length, dup: 0 });
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!categoryId || !subcategoryId || unique.length === 0) return;
    setBusy(true);
    try {
      const db = getDB();
      const now = Date.now();
      // 与已有数据去重：同 code+title+content 跳过
      const existing = await db.prompts.toArray();
      const existKey = new Set(
        existing.map((p) => `${p.code}|${p.title}|${p.content}`),
      );
      let added = 0;
      let dup = 0;
      const toPut: Prompt[] = [];
      for (const d of unique) {
        const key = `${d.code}|${d.title}|${d.content}`;
        if (existKey.has(key)) {
          dup++;
          continue;
        }
        existKey.add(key);
        const id = `p-${now.toString(36)}-${added}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        toPut.push({
          id,
          code: d.code,
          title: d.title,
          categoryId,
          subcategoryId,
          content: d.content,
          tags: ["tag-texture"],
          note: undefined,
          favorite: false,
          usageCount: 0,
          createdAt: now + added,
          updatedAt: now + added,
        });
        added++;
      }
      if (toPut.length > 0) await db.prompts.bulkPut(toPut);
      setImported({ added, dup: dup + duplicates });
    } finally {
      setBusy(false);
    }
  }

  const previewList = unique.slice(0, 6);
  const canImport =
    !!categoryId && !!subcategoryId && unique.length > 0 && !imported;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title="批量导入提示词"
      subtitle="识别「编号｜标题 + 空行分隔」格式，自动拆分为多条"
      footer={
        imported ? (
          <Button variant="primary" size="sm" onClick={handleClose}>
            <Check className="h-3.5 w-3.5" /> 完成
          </Button>
        ) : mode === "json" ? (
          <Button variant="ghost" size="sm" onClick={handleClose}>
            取消
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={!canImport || busy}
            >
              <Upload className="h-3.5 w-3.5" />
              {busy ? "导入中…" : `导入 ${unique.length} 条`}
            </Button>
          </>
        )
      }
    >
      {imported ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-text">
            <Check className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              导入完成
            </p>
            <p className="mt-1 text-[12px] text-muted">
              新增 {imported.added} 条 · 跳过重复 {imported.dup} 条
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 模式切换 */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                mode === "paste"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              粘贴文本（编号｜标题）
            </button>
            <button
              type="button"
              onClick={() => setMode("json")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                mode === "json"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              上传 JSON 备份
            </button>
          </div>

          {mode === "paste" ? (
            <>
              {/* 步骤1：分类归属 */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="归入一级分类" required>
                  <select
                    className={inputCls}
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setSubcategoryId("");
                    }}
                  >
                    <option value="">选择分类…</option>
                    {topCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="归入子类" required>
                  <select
                    className={inputCls}
                    value={subcategoryId}
                    disabled={!categoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                  >
                    <option value="">
                      {categoryId ? "选择子类…" : "先选一级分类"}
                    </option>
                    {(subByParent[categoryId] ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* 步骤2：粘贴 */}
              <Field
                label="提示词文本"
                required
                hint="多条用空行分隔，每条首行「编号｜标题」"
              >
                <div className="relative">
                  <textarea
                    className={cn(inputCls, "min-h-[140px] resize-y leading-relaxed font-mono text-[12px]")}
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder={SAMPLE_IMPORT}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="inline-flex items-center gap-1 text-[12px] text-brand-text hover:underline"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" /> 从剪贴板粘贴
                  </button>
                  {raw && (
                    <button
                      type="button"
                      onClick={() => setRaw("")}
                      className="text-[12px] text-muted hover:text-foreground"
                    >
                      清空
                    </button>
                  )}
                </div>
              </Field>

              {/* 解析预览 */}
              {drafts.length > 0 && (
                <div className="rounded-lg border border-line bg-surface-muted p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">
                      解析预览
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge tone="brand">{unique.length} 条可用</Badge>
                      {duplicates > 0 && (
                        <Badge tone="neutral">
                          文本内重复 {duplicates}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {previewList.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[12px]"
                      >
                        <span className="font-mono text-muted shrink-0">
                          {d.code || "—"}
                        </span>
                        <span className="font-medium text-foreground shrink-0">
                          {d.title}
                        </span>
                        <span className="text-muted line-clamp-1">
                          {d.content.slice(0, 50)}
                          {d.content.length > 50 ? "…" : ""}
                        </span>
                      </li>
                    ))}
                    {unique.length > previewList.length && (
                      <li className="text-[12px] text-muted">
                        …还有 {unique.length - previewList.length} 条
                      </li>
                    )}
                  </ul>
                  {!categoryId || !subcategoryId ? (
                    <p className="mt-2 text-[12px] text-muted">
                      <FileUp className="mr-1 inline h-3 w-3" />
                      选择分类后即可导入
                    </p>
                  ) : (
                    <p className="mt-2 text-[12px] text-brand-text">
                      将归入「{(cats ?? []).find((c) => c.id === categoryId)?.name} › {(cats ?? []).find((c) => c.id === subcategoryId)?.name}」，与已有数据自动去重
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            /* JSON 上传模式 */
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-surface-muted px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-text">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  选择 JSON 备份文件
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  支持本应用导出的 JSON，按 id 合并覆盖
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleJSONFile(f);
                  }}
                />
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-surface-muted">
                  <Upload className="h-3.5 w-3.5" /> 选择文件
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
