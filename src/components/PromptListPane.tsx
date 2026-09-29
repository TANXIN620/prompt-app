"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Star, Clock, LayoutGrid, Inbox } from "lucide-react";
import { getDB } from "@/lib/db";
import { copyText, cn } from "@/lib/utils";
import { useUIStore, type ListFilter } from "@/store/ui-store";
import { PromptCard } from "./PromptCard";
import { EmptyState } from "./ui";

const FILTERS: { key: ListFilter; label: string; icon: typeof Star }[] = [
  { key: "all", label: "全部", icon: LayoutGrid },
  { key: "favorite", label: "收藏", icon: Star },
  { key: "recent", label: "最近使用", icon: Clock },
];

export function PromptListPane() {
  const prompts = useLiveQuery(() => getDB().prompts.toArray(), []);
  const cats = useLiveQuery(() => getDB().categories.toArray(), []);
  const tags = useLiveQuery(() => getDB().tags.toArray(), []);

  const {
    selectedCategoryId,
    selectedSubcategoryId,
    searchQuery,
    listFilter,
    selectedPromptId,
    copiedPromptId,
    setSearch,
    setListFilter,
    selectPrompt,
    setCopied,
  } = useUIStore();

  const { catName, subName, tagName } = useMemo(() => {
    const cn: Record<string, string> = {};
    for (const c of cats ?? []) cn[c.id] = c.name;
    const sn: Record<string, string> = {};
    for (const c of cats ?? []) sn[c.id] = c.name;
    const tn: Record<string, string> = {};
    for (const t of tags ?? []) tn[t.id] = t.name;
    return { catName: cn, subName: sn, tagName: tn };
  }, [cats, tags]);

  const list = useMemo(() => {
    if (!prompts) return [];
    const q = searchQuery.trim().toLowerCase();
    let arr = prompts.filter((p) => {
      // 有搜索词时全局搜索，忽略分类筛选（符合用户直觉）
      if (!q) {
        if (
          selectedSubcategoryId &&
          p.subcategoryId !== selectedSubcategoryId
        )
          return false;
        if (
          selectedCategoryId &&
          !selectedSubcategoryId &&
          p.categoryId !== selectedCategoryId
        )
          return false;
      }
      if (listFilter === "favorite" && !p.favorite) return false;
      if (listFilter === "recent" && !p.lastUsedAt) return false;
      if (q) {
        const hay = [
          p.code,
          p.title,
          catName[p.categoryId] ?? "",
          subName[p.subcategoryId] ?? "",
          p.content,
          p.note ?? "",
          ...p.tags.map((t) => tagName[t] ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // 排序：收藏优先 → 分类序 → 编号
    if (listFilter === "recent") {
      arr = arr
        .slice()
        .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
    } else {
      arr = arr
        .slice()
        .sort((a, b) => {
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
          const ca = catName[a.categoryId] ?? "";
          const cb = catName[b.categoryId] ?? "";
          if (ca !== cb) return ca.localeCompare(cb, "zh");
          return a.code.localeCompare(b.code, undefined, { numeric: true });
        });
    }
    return arr;
  }, [
    prompts,
    searchQuery,
    selectedCategoryId,
    selectedSubcategoryId,
    listFilter,
    catName,
    subName,
    tagName,
  ]);

  async function handleCopy(id: string, content: string) {
    const ok = await copyText(content);
    if (!ok) return;
    const db = getDB();
    const p = await db.prompts.get(id);
    await db.prompts.update(id, {
      usageCount: (p?.usageCount ?? 0) + 1,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1400);
  }

  const q = searchQuery.trim();
  const crumbs = q
    ? `搜索“${q}”`
    : selectedSubcategoryId != null
      ? `${catName[selectedCategoryId ?? ""] ?? ""} › ${subName[selectedSubcategoryId] ?? ""}`
      : selectedCategoryId != null
        ? catName[selectedCategoryId] ?? ""
        : "全部";

  return (
    <div className="flex h-full flex-col">
      {/* 搜索 */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 h-9 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/30">
          <Search className="h-4 w-4 text-muted shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索编号 / 标题 / 分类 / 内容 / 标签"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {searchQuery && (
            <button
              onClick={() => setSearch("")}
              className="text-[11px] text-muted hover:text-foreground"
            >
              清除
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setListFilter(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    listFilter === f.key
                      ? "bg-brand-soft text-brand-text"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {f.label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-muted">
            {crumbs} · {list.length} 条
          </span>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto scroll-thin px-3 pb-3">
        {list.length === 0 ? (
          <div className="h-full min-h-[200px]">
            <EmptyState
              icon={<Inbox className="h-7 w-7" />}
              title="没有匹配的提示词"
              hint="调整搜索关键词或切换分类试试"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                categoryName={catName[p.categoryId] ?? ""}
                subcategoryName={subName[p.subcategoryId] ?? ""}
                selected={selectedPromptId === p.id}
                copied={copiedPromptId === p.id}
                onSelect={() => selectPrompt(p.id)}
                onCopy={() => handleCopy(p.id, p.content)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
