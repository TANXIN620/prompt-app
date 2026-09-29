// 数据模型 —— 个人图像提示词管理系统

/** 提示词主表 */
export interface Prompt {
  id: string;
  /** 编号，如 "01"，拆自 "01｜天然木材" */
  code: string;
  /** 标题，如 "天然木材" */
  title: string;
  /** 一级分类 id */
  categoryId: string;
  /** 二级分类 id */
  subcategoryId: string;
  /** 提示词正文（去掉编号标题行后的全文） */
  content: string;
  /** 标签 id 列表 */
  tags: string[];
  /** 备注 */
  note?: string;
  /** 收藏 */
  favorite: boolean;
  /** 使用次数（复制 +1） */
  usageCount: number;
  /** 最近使用时间戳 */
  lastUsedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** 分类（两级，parentId 为 null 表示一级） */
export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

/** 标签 */
export interface Tag {
  id: string;
  name: string;
  color?: string;
}

/** 批量导入解析出的单条草稿 */
export interface ImportDraft {
  code: string;
  title: string;
  content: string;
  categoryId?: string;
  subcategoryId?: string;
  tags?: string[];
}

/** 中间列表使用的数据视图（带分类名/子类名） */
export interface PromptView extends Prompt {
  categoryName: string;
  subcategoryName: string;
  count: number;
}
