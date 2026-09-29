"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, FolderClosed, Layers } from "lucide-react";
import { getDB } from "@/lib/db";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Badge } from "./ui";

export function CategoryTree() {
  const cats = useLiveQuery(() => getDB().categories.toArray(), []);
  const prompts = useLiveQuery(() => getDB().prompts.toArray(), []);

  const {
    selectedCategoryId,
    selectedSubcategoryId,
    collapsed,
    selectCategory,
    selectSubcategory,
  } = useUIStore();

  const { topCats, subByParent, catCount, subCount } = useMemo(() => {
    const top = (cats ?? [])
      .filter((c) => c.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const sub: Record<string, typeof cats> = {};
    for (const c of cats ?? []) {
      if (c.parentId) {
        (sub[c.parentId] ??= []).push(c);
      }
    }
    for (const k of Object.keys(sub)) {
      const arr = sub[k];
      if (arr) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const cc: Record<string, number> = {};
    const sc: Record<string, number> = {};
    for (const p of prompts ?? []) {
      cc[p.categoryId] = (cc[p.categoryId] ?? 0) + 1;
      sc[p.subcategoryId] = (sc[p.subcategoryId] ?? 0) + 1;
    }
    return { topCats: top, subByParent: sub, catCount: cc, subCount: sc };
  }, [cats, prompts]);

  const totalCount = prompts?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 h-9 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          分类树
        </span>
        <Layers className="h-3.5 w-3.5 text-muted" />
      </div>
      <nav className="flex-1 overflow-y-auto scroll-thin px-2 pb-3">
        {/* 全部 */}
        <button
          onClick={() => useUIStore.getState().clearSelection()}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors",
            selectedCategoryId === null
              ? "bg-brand-soft text-brand-text font-medium"
              : "text-foreground hover:bg-surface-muted",
          )}
        >
          <span>全部提示词</span>
          <span className="font-mono text-[11px] text-muted">
            {totalCount}
          </span>
        </button>

        <div className="mt-1 flex flex-col gap-0.5">
          {topCats.map((cat) => {
            const isOpen = !collapsed.has(cat.id);
            const activeCat =
              selectedCategoryId === cat.id && !selectedSubcategoryId;
            return (
              <div key={cat.id}>
                <button
                  onClick={() => selectCategory(cat.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors",
                    activeCat
                      ? "bg-brand-soft text-brand-text font-medium"
                      : "text-foreground hover:bg-surface-muted",
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        useUIStore.getState().toggleCollapse(cat.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          useUIStore.getState().toggleCollapse(cat.id);
                        }
                      }}
                      className="text-muted"
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </span>
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {catCount[cat.id] ?? 0}
                  </span>
                </button>

                {isOpen &&
                  (subByParent[cat.id] ?? []).map((sub) => {
                    const activeSub =
                      selectedSubcategoryId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() =>
                          selectSubcategory(cat.id, sub.id)
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg py-1 pl-7 pr-2 text-[13px] transition-colors",
                          activeSub
                            ? "bg-brand-soft text-brand-text font-medium"
                            : "text-muted hover:bg-surface-muted hover:text-foreground",
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              activeSub ? "bg-brand" : "bg-muted/40",
                            )}
                          />
                          <span className="truncate">{sub.name}</span>
                        </span>
                        <span className="font-mono text-[11px] opacity-70">
                          {subCount[sub.id] ?? 0}
                        </span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>

        {topCats.length === 0 && (
          <div className="mt-4 flex flex-col items-center gap-1.5 px-3 text-center">
            <FolderClosed className="h-6 w-6 text-muted/50" />
            <p className="text-xs text-muted">暂无分类</p>
          </div>
        )}
      </nav>
      <div className="border-t border-line px-3 py-2">
        <Badge tone="neutral">两级分类 · 可折叠</Badge>
      </div>
    </div>
  );
}
