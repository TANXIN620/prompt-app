"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  Copy,
  Check,
  Pencil,
  Star,
  Trash2,
  Tag as TagIcon,
  StickyNote,
  History,
  PanelRight,
} from "lucide-react";
import { getDB } from "@/lib/db";
import { copyText, cn, formatDate } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { Badge, Button, EmptyState } from "./ui";

export function PromptDetailPane({
  onEdit,
  onDelete,
}: {
  onEdit?: (id: string) => void;
  onDelete?: (id: string, title: string) => void;
}) {
  const id = useUIStore((s) => s.selectedPromptId);
  const copied = useUIStore((s) => s.copiedPromptId === id);
  const setCopied = useUIStore((s) => s.setCopied);

  const data = useLiveQuery(async () => {
    if (!id) return null;
    const db = getDB();
    const p = await db.prompts.get(id);
    if (!p) return null;
    const [cat, sub, tags] = await Promise.all([
      db.categories.get(p.categoryId),
      db.categories.get(p.subcategoryId),
      Promise.all(p.tags.map((t) => db.tags.get(t))),
    ]);
    return {
      p,
      cat: cat?.name,
      sub: sub?.name,
      tags: tags.filter((t): t is NonNullable<typeof t> => !!t),
    };
  }, [id]);

  async function handleCopy() {
    if (!data) return;
    const ok = await copyText(data.p.content);
    if (!ok) return;
    const db = getDB();
    await db.prompts.update(data.p.id, {
      usageCount: data.p.usageCount + 1,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });
    setCopied(data.p.id);
    window.setTimeout(() => setCopied(null), 1400);
  }

  async function toggleFavorite() {
    if (!data) return;
    await getDB().prompts.update(data.p.id, {
      favorite: !data.p.favorite,
      updatedAt: Date.now(),
    });
  }

  if (!id) {
    return (
      <EmptyState
        icon={<PanelRight className="h-7 w-7" />}
        title="选择一条提示词查看详情"
        hint="点击中间列表的任意卡片，即可在此查看全文并一键复制"
      />
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-xs text-muted">加载中…</span>
      </div>
    );
  }

  const { p, cat, sub, tags } = data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4">
        {/* 标题区 */}
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-muted">{p.code}</span>
          <h2 className="flex-1 text-lg font-semibold leading-tight">
            {p.title}
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted">
          {cat} › <span className="text-brand-text font-medium">{sub}</span>
        </p>

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5 text-muted" />
            {tags.map((t) => (
              <Badge key={t.id} tone="accent">
                #{t.name}
              </Badge>
            ))}
          </div>
        )}

        {/* 提示词全文 */}
        <section className="mt-4">
          <SectionLabel>提示词全文</SectionLabel>
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
              {p.content}
            </p>
          </div>
        </section>

        {/* 备注 */}
        {p.note && (
          <section className="mt-3">
            <SectionLabel icon={<StickyNote className="h-3 w-3" />}>
              备注
            </SectionLabel>
            <div className="rounded-lg border-l-2 border-brand bg-surface-muted px-3 py-2 text-[13px] text-muted">
              {p.note}
            </div>
          </section>
        )}

        {/* 使用记录 */}
        <section className="mt-3">
          <SectionLabel icon={<History className="h-3 w-3" />}>
            使用记录
          </SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="使用次数" value={String(p.usageCount)} />
            <Stat label="最近使用" value={formatDate(p.lastUsedAt)} />
            <Stat
              label="收藏"
              value={p.favorite ? "★ 已收藏" : "未收藏"}
              highlight={p.favorite}
            />
          </div>
        </section>
      </div>

      {/* 操作栏 */}
      <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> 已复制
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> 一键复制
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit?.(p.id)}
            title="编辑"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={toggleFavorite}
            title={p.favorite ? "取消收藏" : "收藏"}
          >
            <Star
              className={cn(
                "h-4 w-4",
                p.favorite && "fill-brand text-brand",
              )}
            />
          </Button>
          <Button
            variant="outline"
            onClick={() => onDelete?.(p.id, p.title)}
            title="删除"
            className="text-muted hover:border-red-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">
          复制后自动 +1 使用次数
        </p>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
      {icon}
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line px-2.5 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-mono text-sm font-semibold",
          highlight ? "text-brand" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
