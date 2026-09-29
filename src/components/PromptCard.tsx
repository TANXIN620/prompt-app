"use client";

import { Check, Copy, Star } from "lucide-react";
import type { Prompt } from "@/lib/types";
import { cn, firstLines } from "@/lib/utils";
import { Badge } from "./ui";

export function PromptCard({
  prompt,
  categoryName,
  subcategoryName,
  selected,
  copied,
  onSelect,
  onCopy,
}: {
  prompt: Prompt;
  categoryName: string;
  subcategoryName: string;
  selected: boolean;
  copied: boolean;
  onSelect: () => void;
  onCopy: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group cursor-pointer rounded-xl border bg-surface p-3 transition-all",
        selected
          ? "border-brand ring-1 ring-brand/40"
          : "border-line hover:border-muted/40 hover:shadow-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted shrink-0">
          {prompt.code}
        </span>
        <h3
          className={cn(
            "flex-1 truncate text-sm font-medium",
            selected ? "text-brand-text" : "text-foreground",
          )}
        >
          {prompt.title}
        </h3>
        {prompt.favorite && (
          <Star className="h-3.5 w-3.5 fill-brand text-brand shrink-0" />
        )}
        <Badge tone={selected ? "brand" : "neutral"}>
          {categoryName}·{subcategoryName}
        </Badge>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
        {firstLines(prompt.content, 2)}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>用 {prompt.usageCount} 次</span>
          {prompt.lastUsedAt && (
            <>
              <span>·</span>
              <span>最近 {new Date(prompt.lastUsedAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
            copied
              ? "border-brand bg-brand-soft text-brand-text"
              : "border-line text-muted hover:border-brand hover:text-brand-text",
          )}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> 已复制
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> 复制
            </>
          )}
        </button>
      </div>
    </div>
  );
}
