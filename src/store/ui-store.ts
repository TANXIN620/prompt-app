import { create } from "zustand";

export type ListFilter = "all" | "favorite" | "recent";

/** 分类管理弹窗模式 */
export type CategoryModalMode =
  | "add-root" // 新增根分类
  | "add-child" // 在某分类下新增子级
  | "rename" // 重命名某分类
  | "move" // 移动某分类到新父级
  | "delete"; // 删除某分类

interface CategoryModalState {
  open: boolean;
  mode: CategoryModalMode | null;
  /** 操作目标分类 id（add-child/rename/move/delete 用；add-root 时为 null） */
  targetId: string | null;
}

interface UIState {
  /** 选中的分类节点 id（任意层级；null 表示全部） */
  selectedNodeId: string | null;
  /** 搜索关键词 */
  searchQuery: string;
  /** 折叠的分类节点 id 集合 */
  collapsed: Set<string>;
  /** 列表过滤模式 */
  listFilter: ListFilter;
  /** 选中的提示词 id（右侧详情） */
  selectedPromptId: string | null;
  /** 复制反馈：刚复制的提示词 id */
  copiedPromptId: string | null;
  /** 分类管理弹窗状态 */
  categoryModal: CategoryModalState;

  selectNode: (id: string | null) => void;
  setSearch: (q: string) => void;
  toggleCollapse: (id: string) => void;
  setListFilter: (f: ListFilter) => void;
  selectPrompt: (id: string | null) => void;
  setCopied: (id: string | null) => void;
  openCategoryModal: (
    mode: CategoryModalMode,
    targetId?: string | null,
  ) => void;
  closeCategoryModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  searchQuery: "",
  // 默认折叠三级以下，避免树过长
  collapsed: new Set<string>(["cat-general"]),
  listFilter: "all",
  selectedPromptId: null,
  copiedPromptId: null,
  categoryModal: { open: false, mode: null, targetId: null },

  selectNode: (id) => set({ selectedNodeId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  toggleCollapse: (id) =>
    set((s) => {
      const next = new Set(s.collapsed);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { collapsed: next };
    }),
  setListFilter: (f) => set({ listFilter: f }),
  selectPrompt: (id) => set({ selectedPromptId: id }),
  setCopied: (id) => set({ copiedPromptId: id }),
  openCategoryModal: (mode, targetId = null) =>
    set({ categoryModal: { open: true, mode, targetId } }),
  closeCategoryModal: () =>
    set({ categoryModal: { open: false, mode: null, targetId: null } }),
}));
