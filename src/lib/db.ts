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
    // v1：初始 schema
    this.version(1).stores({
      prompts:
        "id, code, title, categoryId, subcategoryId, usageCount, lastUsedAt, createdAt",
      categories: "id, parentId, sortOrder",
      tags: "id, name",
    });
    // v2：强制重建（修复被外部脚本误建的 v1-only __test 库）
    // 升级时清空旧 store 重建为业务 schema
    this.version(2).stores({
      prompts:
        "id, code, title, categoryId, subcategoryId, usageCount, lastUsedAt, createdAt",
      categories: "id, parentId, sortOrder",
      tags: "id, name",
      __test: null, // 删除可能存在的 __test 测试 store
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
