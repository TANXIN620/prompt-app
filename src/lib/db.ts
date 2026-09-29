import Dexie, { type Table } from "dexie";
import type { Category, Prompt, Tag } from "./types";
import {
  seedCategories,
  seedPrompts,
  seedSubcategories,
  seedTags,
} from "./seed";

export class PromptDB extends Dexie {
  prompts!: Table<Prompt, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;

  constructor() {
    // 换全新库名，避开被外部诊断脚本搞坏的旧 prompt-manager v1 库
    super("prompt-manager-v2");
    this.version(1).stores({
      prompts:
        "id, code, title, categoryId, subcategoryId, usageCount, lastUsedAt, createdAt",
      categories: "id, parentId, sortOrder",
      tags: "id, name",
    });
  }
}

let _db: PromptDB | null = null;

/** 获取单例数据库实例（仅浏览器可用） */
export function getDB(): PromptDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB 仅在浏览器可用");
  }
  if (!_db) _db = new PromptDB();
  return _db;
}

/** 初始化：库为空时写入种子数据 */
export async function initDB(): Promise<void> {
  const db = getDB();
  // 确保库打开成功
  await db.open();
  const count = await db.prompts.count();
  if (count > 0) return;
  await db.transaction("rw", db.categories, db.tags, db.prompts, async () => {
    await db.categories.bulkPut([
      ...seedCategories,
      ...seedSubcategories,
    ]);
    await db.tags.bulkPut(seedTags);
    await db.prompts.bulkPut(seedPrompts);
  });
  console.info("[initDB] 种子数据写入完成，共", seedPrompts.length, "条");
}

/** 重置为种子数据（开发用） */
export async function resetDB(): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.categories, db.tags, db.prompts, async () => {
    await db.prompts.clear();
    await db.categories.clear();
    await db.tags.clear();
    await db.categories.bulkPut([...seedCategories, ...seedSubcategories]);
    await db.tags.bulkPut(seedTags);
    await db.prompts.bulkPut(seedPrompts);
  });
}
