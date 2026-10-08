"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { FlatCategory } from "@/lib/db";
import { cn } from "@/lib/utils";

/**
 * 可搜索的分类下拉选择器。
 * 输入关键字实时过滤完整路径（如「材质类」「柠檬」），
 * 选中后回填完整路径显示。
 */
export function CategoryCombobox({
  options,
  value,
  onChange,
  placeholder = "选择分类…",
  error,
}: {
  options: FlatCategory[];
  value: string; // 选中的 id
  onChange: (id: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.path.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q),
    );
  }, [options, query]);

  // 关闭后高亮归零，避免下次打开跳位置
  useEffect(() => {
    if (!open) setHighlight(0);
  }, [open]);

  // 打开时自动聚焦搜索框
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !triggerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // 选中时滚动到可视区
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function selectOption(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) selectOption(filtered[highlight].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKey}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border bg-surface px-3 py-2 text-sm transition-colors",
          error
            ? "border-red-400"
            : open
              ? "border-brand ring-1 ring-brand/30"
              : "border-line hover:border-muted/40",
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            selected ? "text-foreground" : "text-muted",
          )}
        >
          {selected ? selected.path : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
        >
          {/* 搜索框 */}
          <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKey}
              placeholder="搜索分类名称或路径…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setHighlight(0);
                  inputRef.current?.focus();
                }}
                className="rounded p-0.5 text-muted hover:bg-surface hover:text-foreground"
                title="清空搜索"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* 选项列表 */}
          <div className="max-h-64 overflow-y-auto scroll-thin py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted">
                没有匹配的分类「{query}」
              </div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.id}
                  data-idx={i}
                  type="button"
                  onClick={() => selectOption(opt.id)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                    i === highlight
                      ? "bg-brand-soft text-brand-text"
                      : "text-foreground hover:bg-surface-muted",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <HighlightedPath text={opt.path} query={query} />
                  </span>
                  <span className="font-mono text-[11px] text-muted shrink-0">
                    L{opt.depth + 1}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 把命中的子串高亮加粗 */
function HighlightedPath({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-brand/25 px-0.5 font-semibold text-brand-text">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
