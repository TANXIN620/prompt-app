import Dexie, { type Table } from "dexie";
import type { Category, Prompt, Tag } from "./types";
import {
  seedCategories,
  seedPrompts,
  seedSubcategories,
  seedTags,
} from "./seed";
import { deleteFromCloud, pushOne } from "./sync";

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

/** 初始化：库为空时写入种子数据；旧库自动迁移到三级结构 */
export async function initDB(): Promise<void> {
  const db = getDB();
  // 确保库打开成功
  await db.open();

  const count = await db.prompts.count();
  // 迁移：旧结构（cat-material 在顶层、无 cat-detail）→ 新三级结构
  await migrateToDetailRoot(db);

  if (count === 0) {
    await db.transaction("rw", db.categories, db.tags, db.prompts, async () => {
      // 仅在分类也空时播种（迁移可能已建分类）
      const catCount = await db.categories.count();
      if (catCount === 0) {
        await db.categories.bulkPut([
          ...seedCategories,
          ...seedSubcategories,
        ]);
        await db.tags.bulkPut(seedTags);
        await db.prompts.bulkPut(seedPrompts);
      }
    });
    console.info("[initDB] 种子数据写入完成，共", seedPrompts.length, "条");
  }
}

/** 迁移：把旧的顶层 材质/道具/水果/厨具 挪到"增强细节"根下 */
async function migrateToDetailRoot(db: PromptDB): Promise<void> {
  const hasDetail = await db.categories.get("cat-detail");
  if (hasDetail) return; // 已迁移或新播种
  const mat = await db.categories.get("cat-material");
  // 仅当存在旧顶层材质类且其 parentId 为 null 时迁移
  if (!mat || mat.parentId !== null) return;

  const moves = ["cat-material", "cat-prop", "cat-fruit", "cat-kitchen"];
  await db.transaction("rw", db.categories, async () => {
    await db.categories.put({
      id: "cat-detail",
      name: "增强细节",
      parentId: null,
      sortOrder: 1,
    });
    // 通用提示词排到第 2
    await db.categories
      .where("id")
      .equals("cat-general")
      .modify((c) => {
        c.sortOrder = 2;
      });
    for (const id of moves) {
      await db.categories
        .where("id")
        .equals(id)
        .modify((c) => {
          c.parentId = "cat-detail";
        });
    }
  });
  console.info("[migrate] 已迁移到三级分类结构（增强细节根）");
}

// ===== 分类管理辅助函数 =====

/** 新增分类（可指定父级，sortOrder 自动追加到末尾） */
export async function addCategory(
  name: string,
  parentId: string | null,
): Promise<string> {
  const db = getDB();
  const id = `cat-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const siblings = await db.categories
    .where("parentId")
    .equals(parentId ?? "")
    .toArray();
  // parentId 为 null 时 where 无法匹配，单独处理
  const sameLevel = parentId
    ? siblings
    : (await db.categories.toArray()).filter((c) => c.parentId === null);
  const sortOrder = sameLevel.length + 1;
  const cat: Category = { id, name, parentId, sortOrder, updatedAt: Date.now() };
  await db.categories.put(cat);
  void pushOne();
  return id;
}

/** 重命名分类 */
export async function renameCategory(id: string, name: string): Promise<void> {
  const db = getDB();
  await db.categories
    .where("id")
    .equals(id)
    .modify((c) => {
      c.name = name;
      c.updatedAt = Date.now();
    });
  const updated = await db.categories.get(id);
  if (updated) void pushOne();
}

/** 移动分类到新父级（改变 parentId，sortOrder 追加到目标层级末尾） */
export async function moveCategory(
  id: string,
  newParentId: string | null,
): Promise<void> {
  if (id === newParentId) return;
  // 防止把分类移到自己的子孙下（成环）
  if (newParentId && (await isDescendant(newParentId, id))) {
    throw new Error("不能移动到自己的子分类下");
  }
  const db = getDB();
  const targetSiblings = parentIdList(await db.categories.toArray(), newParentId);
  const sortOrder = targetSiblings.length + 1;
  await db.categories
    .where("id")
    .equals(id)
    .modify((c) => {
      c.parentId = newParentId;
      c.sortOrder = sortOrder;
      c.updatedAt = Date.now();
    });
  const updated = await db.categories.get(id);
  if (updated) void pushOne();
}

/** 删除分类：叶子节点删除，其下提示词归到父级；有子分类则拒绝 */
export async function deleteCategory(id: string): Promise<void> {
  const db = getDB();
  const children = await db.categories.where("parentId").equals(id).toArray();
  if (children.length > 0) {
    throw new Error("请先删除或移动该分类下的子分类");
  }
  const cat = await db.categories.get(id);
  if (!cat) return;
  await db.transaction("rw", db.categories, db.prompts, async () => {
    // 该分类下的提示词归到父级
    await db.prompts
      .where("categoryId")
      .equals(id)
      .modify((p) => {
        p.categoryId = cat.parentId ?? "cat-general";
      });
    // 锚点恰好是被删分类的提示词：清空 subcategoryId，回退到 categoryId
    await db.prompts
      .where("subcategoryId")
      .equals(id)
      .modify((p) => {
        p.subcategoryId = "";
      });
    await db.categories.delete(id);
  });
  void deleteFromCloud();
}

/** 判断 descendantId 是否是 ancestorId 的后代（含自身） */
async function isDescendant(
  descendantId: string,
  ancestorId: string,
): Promise<boolean> {
  if (descendantId === ancestorId) return true;
  const db = getDB();
  const all = await db.categories.toArray();
  let cur: string | null = descendantId;
  while (cur) {
    if (cur === ancestorId) return true;
    const node = all.find((c) => c.id === cur);
    cur = node?.parentId ?? null;
  }
  return false;
}

/** 取某父级下的直接子分类列表 */
function parentIdList(
  all: Category[],
  parentId: string | null,
): Category[] {
  return all
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
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

// ===== 多级分类查询辅助 =====

/** 树节点：用于递归渲染与面包屑 */
export interface CategoryNode extends Category {
  depth: number;
  children: CategoryNode[];
}

/** 把扁平分类列表构建为嵌套树（根节点 depth=0） */
export function buildCategoryTree(all: Category[]): CategoryNode[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of all) {
    const arr = byParent.get(c.parentId) ?? [];
    arr.push(c);
    byParent.set(c.parentId, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const build = (parentId: string | null, depth: number): CategoryNode[] =>
    (byParent.get(parentId) ?? []).map((c) => ({
      ...c,
      depth,
      children: build(c.id, depth + 1),
    }));
  return build(null, 0);
}

/** 取某节点及其全部后代 id（含自身），用于列表过滤 */
export async function getDescendantIds(id: string): Promise<Set<string>> {
  const db = getDB();
  const all = await db.categories.toArray();
  const result = new Set<string>([id]);
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of all) {
      if (c.parentId === cur && !result.has(c.id)) {
        result.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return result;
}

/** 纯函数版本：基于已加载的扁平列表取后代 id 集合（含自身） */
export function collectDescendantIds(
  all: Category[],
  id: string,
): Set<string> {
  const result = new Set<string>([id]);
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of all) {
      if (c.parentId === cur && !result.has(c.id)) {
        result.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return result;
}

/** 取某节点从根到自身的路径（数组首元素为根） */
export function getCategoryPath(
  all: Category[],
  id: string | null | undefined,
): Category[] {
  if (!id) return [];
  const map = new Map(all.map((c) => [c.id, c]));
  const path: Category[] = [];
  let cur = map.get(id);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? map.get(cur.parentId) : undefined;
  }
  return path;
}

/** 提示词所属分类的「锚点」节点 id：优先 subcategoryId，回退 categoryId */
export function getPromptAnchorId(p: {
  categoryId: string;
  subcategoryId: string;
}): string {
  return p.subcategoryId || p.categoryId;
}

/** 展平后的扁平节点（带 depth 与完整路径字符串），用于下拉选择 */
export interface FlatCategory {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  /** 完整路径，如「增强细节 › 材质类 › 木材」 */
  path: string;
}

/** 把嵌套树展平为一维，每项带 depth 与完整路径（用 › 分隔） */
export function flattenTree(all: Category[]): FlatCategory[] {
  const tree = buildCategoryTree(all);
  const out: FlatCategory[] = [];
  const walk = (n: CategoryNode, parents: string[]): void => {
    const path = [...parents, n.name].join(" › ");
    out.push({
      id: n.id,
      name: n.name,
      depth: n.depth,
      parentId: n.parentId,
      path,
    });
    n.children.forEach((c) => walk(c, [...parents, n.name]));
  };
  tree.forEach((r) => walk(r, []));
  return out;
}

/**
 * 把「选中的锚点节点」拆成 Prompt 的 categoryId + subcategoryId：
 * - 有父级时：categoryId = 父级，subcategoryId = 锚点
 * - 是根时：categoryId = 锚点，subcategoryId = ""
 */
export function anchorToPromptFields(
  picked: { id: string; parentId: string | null },
): { categoryId: string; subcategoryId: string } {
  return picked.parentId
    ? { categoryId: picked.parentId, subcategoryId: picked.id }
    : { categoryId: picked.id, subcategoryId: "" };
}
