"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Star } from "lucide-react";
import {
  anchorToPromptFields,
  flattenTree,
  getDB,
} from "@/lib/db";
import type { Prompt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { Button } from "./ui";
import { Field, inputCls, Modal } from "./Modal";
import { CategoryCombobox } from "./CategoryCombobox";
import { pushOne } from "@/lib/sync";

interface FormState {
  code: string;
  title: string;
  /** 选中的分类锚点 id（任意层级） */
  pickedId: string;
  content: string;
  note: string;
  favorite: boolean;
  tags: string[];
}

const EMPTY: FormState = {
  code: "",
  title: "",
  pickedId: "",
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
  const openCategoryModal = useUIStore((s) => s.openCategoryModal);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // 扁平化分类列表（带完整路径），用于下拉
  const flat = useMemo(() => (cats ? flattenTree(cats) : []), [cats]);

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
          // 锚点 = subcategoryId 优先，回退 categoryId
          pickedId: p.subcategoryId || p.categoryId,
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
    if (!form.pickedId) e.pickedId = "请选择分类";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const db = getDB();
      const now = Date.now();
      const picked = (cats ?? []).find((c) => c.id === form.pickedId);
      if (!picked) {
        setErrors({ pickedId: "分类不存在，请重新选择" });
        return;
      }
      const { categoryId, subcategoryId } = anchorToPromptFields(picked);
      if (editId) {
        await db.prompts.update(editId, {
          code: form.code.trim(),
          title: form.title.trim(),
          categoryId,
          subcategoryId,
          content: form.content,
          note: form.note.trim() || undefined,
          favorite: form.favorite,
          tags: form.tags,
          updatedAt: now,
        });
        const updated = await db.prompts.get(editId);
        if (updated) void pushOne();
        selectPrompt(editId);
      } else {
        const id = `p-${now.toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const prompt: Prompt = {
          id,
          code: form.code.trim(),
          title: form.title.trim(),
          categoryId,
          subcategoryId,
          content: form.content,
          tags: form.tags,
          note: form.note.trim() || undefined,
          favorite: form.favorite,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        await db.prompts.put(prompt);
        void pushOne();
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
      </div>

      {/* 分类选择：可搜索的下拉 */}
      <div className="mt-3">
        <Field
          label="所属分类"
          required
          hint="输入关键字快速定位；缺失分类可在分类树右上角新增"
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <CategoryCombobox
                options={flat}
                value={form.pickedId}
                onChange={(id) => update("pickedId", id)}
                error={!!errors.pickedId}
              />
              {errors.pickedId && (
                <p className="mt-1 text-[11px] text-red-500">{errors.pickedId}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              title="新增分类"
              onClick={() => openCategoryModal("add-root", null)}
            >
              + 新增
            </Button>
          </div>
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
