"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  Check,
  FolderPlus,
  Pencil,
  FolderInput,
  Trash2,
  Plus,
} from "lucide-react";
import {
  addCategory,
  buildCategoryTree,
  collectDescendantIds,
  deleteCategory,
  getDB,
  getCategoryPath,
  moveCategory,
  renameCategory,
  type CategoryNode,
} from "@/lib/db";
import { useUIStore, type CategoryModalMode } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "./ui";
import { Field, inputCls, Modal } from "./Modal";

const MODE_META: Record<
  Exclude<CategoryModalMode, null>,
  { title: string; subtitle: string; icon: typeof Plus; danger?: boolean }
> = {
  "add-root": {
    title: "新增根分类",
    subtitle: "在分类树顶层创建一个新分类",
    icon: Plus,
  },
  "add-child": {
    title: "新增子级分类",
    subtitle: "在所选分类下继续向下扩展层级",
    icon: FolderPlus,
  },
  rename: {
    title: "重命名分类",
    subtitle: "只改名字，位置与子级保持不变",
    icon: Pencil,
  },
  move: {
    title: "移动分类",
    subtitle: "把该分类连同其子树挪到其它父级下",
    icon: FolderInput,
  },
  delete: {
    title: "删除分类",
    subtitle: "叶子节点可直接删除；有子级时请先移动或删除子级",
    icon: Trash2,
    danger: true,
  },
};

export function CategoryManageDialog() {
  const { categoryModal, closeCategoryModal, selectNode } = useUIStore();
  const { open, mode, targetId } = categoryModal;

  const cats = useLiveQuery(() => getDB().categories.toArray(), []);

  // 目标分类对象
  const target = useMemo(
    () => (cats && targetId ? cats.find((c) => c.id === targetId) ?? null : null),
    [cats, targetId],
  );

  // 目标分类的完整路径（用于展示上下文）
  const targetPath = useMemo(
    () => (cats && target ? getCategoryPath(cats, target.id) : []),
    [cats, target],
  );

  // 移动模式：可选父级列表（排除自身及其后代，避免成环）
  const moveOptions = useMemo<CategoryNode[]>(() => {
    if (!cats || !target) return [];
    const forbidden = collectDescendantIds(cats, target.id);
    const filtered = cats.filter((c) => !forbidden.has(c.id));
    return buildCategoryTree(filtered);
  }, [cats, target]);

  const [name, setName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 每次打开或模式切换时重置表单
  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    if (mode === "rename" && target) setName(target.name);
    else if (mode === "add-root" || mode === "add-child") setName("");
    else if (mode === "move" && target) {
      // 默认选中「移到顶层」
      setNewParentId("");
    }
  }, [open, mode, target]);

  // 删除模式：被删分类的直接子级数量（用于风险提示）
  const childCount = useMemo(() => {
    if (!cats || !targetId) return 0;
    return cats.filter((c) => c.parentId === targetId).length;
  }, [cats, targetId]);

  if (!open || !mode) return null;

  const meta = MODE_META[mode];
  const Icon = meta.icon;

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "add-root") {
        const trimmed = name.trim();
        if (!trimmed) {
          setError("请输入分类名称");
          return;
        }
        const id = await addCategory(trimmed, null);
        selectNode(id);
      } else if (mode === "add-child") {
        if (!targetId) return;
        const trimmed = name.trim();
        if (!trimmed) {
          setError("请输入分类名称");
          return;
        }
        const id = await addCategory(trimmed, targetId);
        selectNode(id);
      } else if (mode === "rename") {
        if (!targetId) return;
        const trimmed = name.trim();
        if (!trimmed) {
          setError("请输入分类名称");
          return;
        }
        await renameCategory(targetId, trimmed);
      } else if (mode === "move") {
        if (!targetId) return;
        const parentId = newParentId || null;
        await moveCategory(targetId, parentId);
      } else if (mode === "delete") {
        if (!targetId) return;
        await deleteCategory(targetId);
        selectNode(null);
      }
      closeCategoryModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = (() => {
    if (mode === "rename" || mode === "add-root" || mode === "add-child")
      return name.trim().length > 0;
    if (mode === "move") return true; // 任何选择（含移到顶层）都允许
    if (mode === "delete") return true;
    return false;
  })();

  return (
    <Modal
      open={open}
      onClose={closeCategoryModal}
      size={mode === "move" ? "md" : "sm"}
      title={meta.title}
      subtitle={meta.subtitle}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={closeCategoryModal}>
            取消
          </Button>
          <Button
            variant={meta.danger ? "primary" : "primary"}
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit || busy}
            className={
              meta.danger
                ? "bg-red-500 text-white hover:bg-red-600 hover:brightness-100"
                : ""
            }
          >
            <Check className="h-3.5 w-3.5" />
            {busy ? "处理中…" : mode === "delete" ? "确认删除" : "保存"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* 目标分类上下文（除 add-root 外都展示） */}
        {mode !== "add-root" && target && (
          <div className="rounded-lg border border-line bg-surface-muted px-3 py-2">
            <div className="text-[11px] text-muted">当前分类</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Icon className="h-3.5 w-3.5 text-muted" />
              {targetPath.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted">›</span>}
                  <span>{c.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 名称输入：add-root / add-child / rename */}
        {(mode === "add-root" ||
          mode === "add-child" ||
          mode === "rename") && (
          <Field
            label={
              mode === "add-root"
                ? "根分类名称"
                : mode === "add-child"
                  ? "子级名称"
                  : "新名称"
            }
            required
          >
            <input
              className={cn(inputCls, error && "border-red-400")}
              value={name}
              autoFocus
              placeholder="如：光影类"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit && !busy) handleSubmit();
              }}
            />
            {error && (
              <p className="mt-1 text-[11px] text-red-500">{error}</p>
            )}
          </Field>
        )}

        {/* 移动模式：选择新父级 */}
        {mode === "move" && target && (
          <Field label="移动到" required hint="可选其它分类作为新父级，或「作为根分类」">
            <select
              className={cn(inputCls, error && "border-red-400")}
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
            >
              <option value="">— 作为根分类（顶层）—</option>
              {flatten(moveOptions).map((n) => (
                <option key={n.id} value={n.id}>
                  {"　".repeat(n.depth)}
                  {n.name}
                </option>
              ))}
            </select>
            {error && (
              <p className="mt-1 text-[11px] text-red-500">{error}</p>
            )}
            <p className="mt-1.5 text-[11px] text-muted">
              移动后该分类及其全部子级会一起跟到新父级下。
            </p>
          </Field>
        )}

        {/* 删除模式：风险提示 */}
        {mode === "delete" && target && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                确定删除分类「{target.name}」吗？
              </p>
              {childCount > 0 ? (
                <p className="mt-1 text-[12px] text-red-500">
                  该分类下还有 {childCount} 个子级，请先移动或删除子级后再操作。
                </p>
              ) : (
                <p className="mt-1 text-[12px] text-muted">
                  叶子节点可直接删除；其下提示词会自动归到上一级分类。
                </p>
              )}
              {error && (
                <p className="mt-1 text-[11px] text-red-500">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** 把嵌套树展平为一维数组（保留 depth），用于 <select> 渲染 */
function flatten(roots: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (n: CategoryNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}
