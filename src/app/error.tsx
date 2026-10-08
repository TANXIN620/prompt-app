"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

/**
 * 全局错误边界：任何渲染期异常都会落到这里，显示提示而非白屏。
 * 常见触发：浏览器缓存了旧版 index.html，引用的旧 JS chunk 已被新部署删除 → hydration 失败。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        !
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        页面没能正常加载
      </h2>
      <p className="max-w-md text-sm text-muted">
        多半是浏览器缓存了旧版资源。请尝试
        <strong className="text-foreground">强制刷新</strong>
        （Ctrl/Cmd + Shift + R），或清除站点缓存后重试。若仍不行，可点下方重置。
      </p>
      <pre className="max-w-md overflow-auto rounded-lg border border-line bg-surface-muted p-2 text-left text-[11px] text-muted">
        {error.message || String(error)}
      </pre>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95"
      >
        <RotateCcw className="h-4 w-4" />
        重试加载
      </button>
    </div>
  );
}
