"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { getDB } from "@/lib/db";
import { deleteFromCloud } from "@/lib/sync";
import { useUIStore } from "@/store/ui-store";
import { Button } from "./ui";
import { Modal } from "./Modal";

export function DeleteConfirmDialog({
  open,
  promptId,
  promptTitle,
  onClose,
}: {
  open: boolean;
  promptId: string | null;
  promptTitle: string;
  onClose: () => void;
}) {
  const selectPrompt = useUIStore((s) => s.selectPrompt);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!promptId) return;
    setBusy(true);
    try {
      await getDB().prompts.delete(promptId);
      void deleteFromCloud("prompts", promptId);
      selectPrompt(null);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="删除提示词"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDelete}
            disabled={busy}
            className="bg-red-500 text-white hover:bg-red-600 hover:brightness-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {busy ? "删除中…" : "确认删除"}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-foreground">
            确定删除提示词「{promptTitle}」吗？
          </p>
          <p className="mt-1 text-[12px] text-muted">
            删除后无法恢复，相关使用记录将一并清除。
          </p>
        </div>
      </div>
    </Modal>
  );
}
