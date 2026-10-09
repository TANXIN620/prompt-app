import { supabase, isCloudEnabled } from "./supabase";
import { getDB } from "./db";
import type { Category, Prompt, Tag } from "./types";

/** 所有数据打包成一个 JSON 存在 Storage，避免建表 */
interface CloudDump {
  categories: Category[];
  tags: Tag[];
  prompts: Prompt[];
}

const BUCKET = "data";
const FILE = "db.json";

/** 从云端下载 db.json 并合并到本地（last-write-wins） */
export async function pullFromCloud(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isCloudEnabled || !supabase)
    return { ok: false, message: "未配置云端同步（缺少 Supabase 密钥）" };

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(FILE);
    if (error) {
      // 404 表示云端还没有数据，跳过
      if (error.message?.includes("404") || String(error.statusCode) === "404") {
        return { ok: true, message: "云端暂无数据，已使用本地数据" };
      }
      throw error;
    }
    const text = await data.text();
    const dump = JSON.parse(text) as CloudDump;

    const db = getDB();
    const [localCats, localTags, localPrompts] = await Promise.all([
      db.categories.toArray(),
      db.tags.toArray(),
      db.prompts.toArray(),
    ]);

    const mergedCats = mergeByUpdatedAt(localCats, dump.categories ?? []);
    const mergedTags = mergeByUpdatedAt(localTags, dump.tags ?? []);
    const mergedPrompts = mergeByUpdatedAt(localPrompts, dump.prompts ?? []);

    await db.transaction("rw", db.categories, db.tags, db.prompts, async () => {
      await db.categories.bulkPut(mergedCats);
      await db.tags.bulkPut(mergedTags);
      await db.prompts.bulkPut(mergedPrompts);
    });

    return {
      ok: true,
      message: `已从云端同步：分类 ${mergedCats.length} · 标签 ${mergedTags.length} · 提示词 ${mergedPrompts.length}`,
    };
  } catch (e) {
    console.error("[sync] pull failed", e);
    return { ok: false, message: `拉取失败：${e instanceof Error ? e.message : String(e)}` };
  }
}

/** 把本地全部数据打包上传覆盖 db.json */
export async function pushToCloud(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isCloudEnabled || !supabase)
    return { ok: false, message: "未配置云端同步" };

  try {
    const db = getDB();
    const [categories, tags, prompts] = await Promise.all([
      db.categories.toArray(),
      db.tags.toArray(),
      db.prompts.toArray(),
    ]);

    const now = Date.now();
    const dump: CloudDump = {
      categories: categories.map((c) => ({ ...c, updatedAt: c.updatedAt ?? now })),
      tags: tags.map((t) => ({ ...t, updatedAt: t.updatedAt ?? now })),
      prompts: prompts.map((p) => ({ ...p, updatedAt: p.updatedAt ?? now })),
    };

    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: "application/json",
    });
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(FILE, blob, { upsert: true, contentType: "application/json" });
    if (error) throw error;

    return {
      ok: true,
      message: `已推送到云端：分类 ${categories.length} · 标签 ${tags.length} · 提示词 ${prompts.length}`,
    };
  } catch (e) {
    console.error("[sync] push failed", e);
    return { ok: false, message: `推送失败：${e instanceof Error ? e.message : String(e)}` };
  }
}

/** 双向同步：先拉再推 */
export async function syncAll(): Promise<{ ok: boolean; message: string }> {
  const pull = await pullFromCloud();
  if (!pull.ok) return pull;
  const push = await pushToCloud();
  if (!push.ok) return push;
  return { ok: true, message: "同步完成" };
}

/** 任意变更后触发一次全量推送（本地数据少，几十毫秒） */
export async function pushOne(): Promise<void> {
  if (!isCloudEnabled) return;
  const r = await pushToCloud();
  if (!r.ok) console.error("[sync] pushOne failed", r.message);
}

/** 兼容旧调用签名 */
export async function deleteFromCloud(): Promise<void> {
  if (!isCloudEnabled) return;
  await pushToCloud();
}

function mergeByUpdatedAt<T extends { id: string; updatedAt?: number }>(
  local: T[],
  cloud: T[],
): T[] {
  const map = new Map<string, T>();
  for (const r of local) map.set(r.id, r);
  for (const c of cloud) {
    const cur = map.get(c.id);
    if (!cur || (c.updatedAt ?? 0) >= (cur.updatedAt ?? 0)) {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values());
}
