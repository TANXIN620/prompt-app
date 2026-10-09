import { supabase, isCloudEnabled } from "./supabase";
import { getDB } from "./db";
import type { Category, Prompt, Tag } from "./types";

/** 合并策略：last-write-wins，按 updatedAt 比较；无时间戳的视为旧 */
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

/** 从云端拉取并合并到本地 IndexedDB（last-write-wins） */
export async function pullFromCloud(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isCloudEnabled || !supabase)
    return { ok: false, message: "未配置云端同步（缺少 Supabase 密钥）" };

  try {
    const [catRes, tagRes, promptRes] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("tags").select("*"),
      supabase.from("prompts").select("*"),
    ]);

    if (catRes.error) throw catRes.error;
    if (tagRes.error) throw tagRes.error;
    if (promptRes.error) throw promptRes.error;

    const db = getDB();
    const [localCats, localTags, localPrompts] = await Promise.all([
      db.categories.toArray(),
      db.tags.toArray(),
      db.prompts.toArray(),
    ]);

    const mergedCats = mergeByUpdatedAt(localCats, catRes.data as Category[]);
    const mergedTags = mergeByUpdatedAt(localTags, tagRes.data as Tag[]);
    const mergedPrompts = mergeByUpdatedAt(
      localPrompts,
      promptRes.data as Prompt[],
    );

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

/** 把本地全部数据推送到云端（upsert） */
export async function pushToCloud(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isCloudEnabled || !supabase)
    return { ok: false, message: "未配置云端同步" };

  try {
    const db = getDB();
    const [cats, tags, prompts] = await Promise.all([
      db.categories.toArray(),
      db.tags.toArray(),
      db.prompts.toArray(),
    ]);

    // 给无 updatedAt 的记录补上当前时间，保证云端合并正确
    const now = Date.now();
    const catsReady = cats.map((c) => ({ ...c, updatedAt: c.updatedAt ?? now }));
    const tagsReady = tags.map((t) => ({ ...t, updatedAt: t.updatedAt ?? now }));
    const promptsReady = prompts.map((p) => ({ ...p, updatedAt: p.updatedAt ?? now }));

    const results = await Promise.all([
      supabase.from("categories").upsert(catsReady as any, { onConflict: "id" }),
      supabase.from("tags").upsert(tagsReady as any, { onConflict: "id" }),
      supabase.from("prompts").upsert(promptsReady as any, { onConflict: "id" }),
    ]);

    for (const r of results) {
      if (r.error) throw r.error;
    }

    return {
      ok: true,
      message: `已推送到云端：分类 ${cats.length} · 标签 ${tags.length} · 提示词 ${prompts.length}`,
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

/** 单条记录推送到云端（增删改后调用） */
export async function pushOne(
  table: "categories" | "tags" | "prompts",
  record: Category | Tag | Prompt,
): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  const ready = { ...record, updatedAt: record.updatedAt ?? Date.now() };
  const { error } = await supabase.from(table).upsert(ready as any, { onConflict: "id" });
  if (error) console.error("[sync] pushOne failed", table, error);
}

/** 从云端删除单条（本地删除后调用） */
export async function deleteFromCloud(
  table: "categories" | "tags" | "prompts",
  id: string,
): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error("[sync] deleteFromCloud failed", table, error);
}
