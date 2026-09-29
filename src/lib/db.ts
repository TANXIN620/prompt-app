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
    super("prompt-manager");
    // 索引：按分类/子类/收藏/时间检索，搜索靠 categoryId + 全表过滤
    this.version(1).stores({
      // favorite 为布尔值，不能作为索引键，改为内存过滤
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
