import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 复制文本到剪贴板，返回是否成功 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** 格式化时间戳为 YYYY-MM-DD */
export function formatDate(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 取文本前 N 行用于卡片预览 */
export function firstLines(text: string, lines = 2): string {
  return text.split("\n").slice(0, lines).join(" ");
}

/** 截断文本 */
export function truncate(text: string, max = 60): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}
