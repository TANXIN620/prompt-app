"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Star } from "lucide-react";
import { getDB } from "@/lib/db";
import type { Prompt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { Button } from "./ui";
import { Field, inputCls, Modal } from "./Modal";

interface FormState {
  code: string;
  title: string;
  categoryId: string;
  subcategoryId: string;
  content: string;
  note: string;
  favorite: boolean;
  tags: string[];
}

const EMPTY: FormState = {
  code: "",
  title: "",
  categoryId: "",
  subcategoryId: "",
  content: "",
  note: "",
  favorite: false,
  tags: [],
};

export function PromptFormDialog({
  open,
  editId,
  onClose,
}: {
  open: boolean;
  editId: string | null;
  onClose: () => void;
}) {
  const cats = useLiveQuery(() => getDB().categories.toArray(), []);
  const tags = useLiveQuery(() => getDB().tags.toArray(), []);
  const selectPrompt = useUIStore((s) => s.selectPrompt);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  // 编辑模式下加载已有数据
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!editId) {
      setForm(EMPTY);
      return;
    }
    (async () => {
      const p = await getDB().prompts.get(editId);
      if (p) {
        setForm({
          code: p.code,
          title: p.title,
          categoryId: p.categoryId,
          subcategoryId: p.subcategoryId,
          content: p.content,
          note: p.note ?? "",
          favorite: p.favorite,
          tags: [...p.tags],
        });
      }
    })();
  }, [open, editId]);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "请填写标题";
    if (!form.content.trim()) e.content = "请填写提示词内容";
    if (!form.categoryId) e.categoryId = "请选择分类";
    if (!form.subcategoryId) e.subcategoryId = "请选择子类";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const db = getDB();
      const now = Date.now();
      if (editId) {
        const prev = await db.prompts.get(editId);
        await db.prompts.update(editId, {
          code: form.code.trim(),
          title: form.title.trim(),
          categoryId: form.categoryId,
          subcategoryId: form.subcategoryId,
          content: form.content,
          note: form.note.trim() || undefined,
          favorite: form.favorite,
          tags: form.tags,
          updatedAt: now,
        });
        selectPrompt(editId);
      } else {
        const id = `p-${now.toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const prompt: Prompt = {
          id,
          code: form.code.trim(),
          title: form.title.trim(),
          categoryId: form.categoryId,
          subcategoryId: form.subcategoryId,
          content: form.content,
          tags: form.tags,
          note: form.note.trim() || undefined,
          favorite: form.favorite,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        await db.prompts.put(prompt);
        selectPrompt(id);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editId ? "编辑提示词" : "新建提示词"}
      subtitle={
        editId ? "修改后将更新时间戳，使用记录保留" : "新建后即可在列表中看到"
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? "保存中…" : "保存"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="编号" hint="如 01，对应表格的 01｜">
          <input
            className={inputCls}
            value={form.code}
            placeholder="01"
            onChange={(e) => update("code", e.target.value)}
          />
        </Field>
        <Field label="标题" required>
          <input
            className={cn(inputCls, errors.title && "border-red-400")}
            value={form.title}
            placeholder="如 天然木材"
            onChange={(e) => update("title", e.target.value)}
          />
          {errors.title && (
            <p className="mt-1 text-[11px] text-red-500">{errors.title}</p>
          )}
        </Field>

        <Field label="一级分类" required>
          <select
            className={cn(inputCls, errors.categoryId && "border-red-400")}
            value={form.categoryId}
            onChange={(e) => {
              update("categoryId", e.target.value);
              update("subcategoryId", "");
            }}
          >
            <option value="">选择分类…</option>
            {topCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-[11px] text-red-500">{errors.categoryId}</p>
          )}
        </Field>
        <Field label="子类" required>
          <select
            className={cn(inputCls, errors.subcategoryId && "border-red-400")}
            value={form.subcategoryId}
            disabled={!form.categoryId}
            onChange={(e) => update("subcategoryId", e.target.value)}
          >
            <option value="">
              {form.categoryId ? "选择子类…" : "先选一级分类"}
            </option>
            {(subByParent[form.categoryId] ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.subcategoryId && (
            <p className="mt-1 text-[11px] text-red-500">
              {errors.subcategoryId}
            </p>
          )}
        </Field>
      </div>

      <div className="mt-3">
        <Field label="提示词内容" required hint="完整正文，复制时取此字段">
          <textarea
            className={cn(
              inputCls,
              "min-h-[120px] resize-y leading-relaxed",
              errors.content && "border-red-400",
            )}
            value={form.content}
            placeholder="增强真实天然木材质感…"
            onChange={(e) => update("content", e.target.value)}
          />
          {errors.content && (
            <p className="mt-1 text-[11px] text-red-500">{errors.content}</p>
          )}
        </Field>
      </div>

      <div className="mt-3">
        <Field label="备注" hint="可选，仅自己看">
          <input
            className={inputCls}
            value={form.note}
            placeholder="如：搭配金属/大理石使用"
            onChange={(e) => update("note", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="标签">
          <div className="flex flex-wrap gap-1.5">
            {(tags ?? []).map((t) => {
              const on = form.tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    update(
                      "tags",
                      on
                        ? form.tags.filter((x) => x !== t.id)
                        : [...form.tags, t.id],
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                    on
                      ? "border-brand bg-brand-soft text-brand-text"
                      : "border-line text-muted hover:border-muted/40 hover:text-foreground",
                  )}
                >
                  #{t.name}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => update("favorite", !form.favorite)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
            form.favorite
              ? "border-brand bg-brand-soft text-brand-text"
              : "border-line text-muted hover:text-foreground",
          )}
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              form.favorite && "fill-brand text-brand",
            )}
          />
          {form.favorite ? "已收藏" : "加入收藏"}
        </button>
      </div>
    </Modal>
  );
}
