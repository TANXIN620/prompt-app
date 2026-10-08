"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronRight,
  FolderClosed,
  FolderOpen,
  Layers,
  Plus,
  FolderPlus,
  Pencil,
  FolderInput,
  Trash2,
} from "lucide-react";
import {
  buildCategoryTree,
  getDB,
  getPromptAnchorId,
  type CategoryNode,
} from "@/lib/db";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

export function CategoryTree() {
  const cats = useLiveQuery(() => getDB().categories.toArray(), []);
  const prompts = useLiveQuery(() => getDB().prompts.toArray(), []);

  const { selectedNodeId, collapsed, selectNode, openCategoryModal } =
    useUIStore();

  // 节点 -> 子树下提示词总数
  const nodeCount = useMemo(() => {
    const map: Record<string, number> = {};
    if (!cats || !prompts) return map;
    for (const p of prompts) {
      const anchor = getPromptAnchorId(p);
      map[anchor] = (map[anchor] ?? 0) + 1;
    }
    const tree = buildCategoryTree(cats);
    const acc = (n: CategoryNode): number => {
      const self = map[n.id] ?? 0;
      const sub = n.children.reduce((s, c) => s + acc(c), 0);
      const total = self + sub;
      map[n.id] = total;
      return total;
    };
    for (const r of tree) acc(r);
    return map;
  }, [cats, prompts]);

  const tree = useMemo(() => (cats ? buildCategoryTree(cats) : []), [cats]);
  const totalCount = prompts?.length ?? 0;

  // 监听自身宽度：< 220px 隐藏操作图标/计数，给分类名让空间
  const [panelW, setPanelW] = useState(300);
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setPanelW(e.contentRect.width);
    });
    const el = document.getElementById("cat-tree-panel");
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tight = panelW < 220;

  return (
    <div id="cat-tree-panel" className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-3 h-9 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          分类树
        </span>
        {!tight && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px]"
            title="新增根分类"
            onClick={() => openCategoryModal("add-root", null)}
          >
            <Plus className="h-3.5 w-3.5" />
            根分类
          </Button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto scroll-thin px-2 pb-3">
        {/* 全部 */}
        <button
          onClick={() => selectNode(null)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors",
            selectedNodeId === null
              ? "bg-brand-soft text-brand-text font-medium"
              : "text-foreground hover:bg-surface-muted",
          )}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Layers className="h-3.5 w-3.5 text-muted" />
            <span>全部提示词</span>
          </span>
          {!tight && (
            <span className="font-mono text-[11px] text-muted">
              {totalCount}
            </span>
          )}
        </button>

        <div className="mt-1 flex flex-col gap-0.5">
          {tree.map((node) => (
            <CategoryNodeView
              key={node.id}
              node={node}
              counts={nodeCount}
              tight={tight}
              selectedNodeId={selectedNodeId}
              collapsed={collapsed}
              onSelect={selectNode}
              onToggle={useUIStore.getState().toggleCollapse}
              onAction={openCategoryModal}
            />
          ))}
        </div>

        {tree.length === 0 && (
          <div className="mt-4 flex flex-col items-center gap-1.5 px-3 text-center">
            <FolderClosed className="h-6 w-6 text-muted/50" />
            <p className="text-xs text-muted">暂无分类</p>
            {!tight && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-7"
                onClick={() => openCategoryModal("add-root", null)}
              >
                <Plus className="h-3.5 w-3.5" />
                新增根分类
              </Button>
            )}
          </div>
        )}
      </nav>
      {!tight && (
        <div className="border-t border-line px-3 py-2">
          <span className="text-[11px] text-muted">
            多级分类 · 支持新增 / 重命名 / 移动 / 删除
          </span>
        </div>
      )}
    </div>
  );
}

function CategoryNodeView({
  node,
  counts,
  tight,
  selectedNodeId,
  collapsed,
  onSelect,
  onToggle,
  onAction,
}: {
  node: CategoryNode;
  counts: Record<string, number>;
  tight: boolean;
  selectedNodeId: string | null;
  collapsed: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAction: (
    mode: "add-child" | "rename" | "move" | "delete",
    targetId: string,
  ) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = !collapsed.has(node.id);
  const active = selectedNodeId === node.id;
  const count = counts[node.id] ?? 0;
  const Icon = hasChildren ? (isOpen ? FolderOpen : FolderClosed) : null;

  return (
    <div>
      <div
        className={cn(
          "group flex w-full items-center justify-between rounded-lg py-1 pr-1 text-sm transition-colors",
          active
            ? "bg-brand-soft text-brand-text font-medium"
            : "text-foreground hover:bg-surface-muted",
        )}
        style={{ paddingLeft: `${8 + node.depth * 16}px` }}
      >
        <button
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          {/* 折叠箭头 / 占位 */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              if (!hasChildren) return;
              e.stopPropagation();
              onToggle(node.id);
            }}
            onKeyDown={(e) => {
              if (!hasChildren) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggle(node.id);
              }
            }}
            className={cn("shrink-0", !hasChildren && "invisible")}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform text-muted",
                isOpen && "rotate-90",
              )}
            />
          </span>
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />}
          <span className="truncate">{node.name}</span>
        </button>

        {!tight && (
          <div className="flex items-center gap-0.5">
            <span className="flex items-center gap-0.5 opacity-40 transition-opacity group-hover:opacity-100">
              <IconBtn
                title="新增子级"
                onClick={() => onAction("add-child", node.id)}
              >
                <FolderPlus className="h-3 w-3" />
              </IconBtn>
              <IconBtn title="重命名" onClick={() => onAction("rename", node.id)}>
                <Pencil className="h-3 w-3" />
              </IconBtn>
              <IconBtn title="移动到…" onClick={() => onAction("move", node.id)}>
                <FolderInput className="h-3 w-3" />
              </IconBtn>
              <IconBtn
                title="删除"
                danger
                onClick={() => onAction("delete", node.id)}
              >
                <Trash2 className="h-3 w-3" />
              </IconBtn>
            </span>
            <span className="font-mono text-[11px] text-muted">{count}</span>
          </div>
        )}
      </div>

      {isOpen &&
        hasChildren &&
        node.children.map((child) => (
          <CategoryNodeView
            key={child.id}
            node={child}
            counts={counts}
            tight={tight}
            selectedNodeId={selectedNodeId}
            collapsed={collapsed}
            onSelect={onSelect}
            onToggle={onToggle}
            onAction={onAction}
          />
        ))}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "rounded p-1 text-muted transition-colors hover:bg-surface",
        danger ? "hover:text-red-500" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
