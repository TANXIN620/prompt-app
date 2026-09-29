"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* 面板 */}
      <div
        className={cn(
          "relative flex max-h-[88vh] w-full flex-col rounded-2xl border border-line bg-surface shadow-xl",
          widths[size],
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[12px] font-medium text-foreground">
        {label}
        {required && <span className="text-brand">*</span>}
        {hint && <span className="font-normal text-muted">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand/30";
