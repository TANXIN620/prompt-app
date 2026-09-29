import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-on hover:brightness-95",
  ghost: "text-muted hover:text-foreground hover:bg-surface-muted",
  outline:
    "border border-line text-foreground bg-surface hover:bg-surface-muted",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-2.5 h-7",
  md: "text-sm px-3 h-9",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "accent";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-muted text-muted",
    brand: "bg-brand-soft text-brand-text",
    accent: "bg-accent-soft text-accent-text",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center">
      {icon && <div className="text-muted/60">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
