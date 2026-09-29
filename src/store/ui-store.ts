import { create } from "zustand";

export type ListFilter = "all" | "favorite" | "recent";

interface UIState {
  /** 选中的一级分类（点击子类时其父类自动选中） */
  selectedCategoryId: string | null;
  /** 选中的二级分类；为 null 表示展示该一级分类下全部 */
  selectedSubcategoryId: string | null;
  /** 搜索关键词 */
  searchQuery: string;
  /** 折叠的一级分类 id 集合 */
  collapsed: Set<string>;
  /** 列表过滤模式 */
  listFilter: ListFilter;
  /** 选中的提示词 id（右侧详情） */
  selectedPromptId: string | null;
  /** 复制反馈：刚复制的提示词 id */
  copiedPromptId: string | null;

  selectCategory: (categoryId: string) => void;
  selectSubcategory: (categoryId: string, subcategoryId: string) => void;
  clearSelection: () => void;
  setSearch: (q: string) => void;
  toggleCollapse: (categoryId: string) => void;
  setListFilter: (f: ListFilter) => void;
  selectPrompt: (id: string | null) => void;
  setCopied: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedCategoryId: null,
  selectedSubcategoryId: null,
  searchQuery: "",
  collapsed: new Set(["cat-prop", "cat-fruit", "cat-kitchen", "cat-general"]),
  listFilter: "all",
  selectedPromptId: null,
  copiedPromptId: null,

  selectCategory: (categoryId) =>
    set({ selectedCategoryId: categoryId, selectedSubcategoryId: null }),
  selectSubcategory: (categoryId, subcategoryId) =>
    set({
      selectedCategoryId: categoryId,
      selectedSubcategoryId: subcategoryId,
    }),
  clearSelection: () =>
    set({ selectedCategoryId: null, selectedSubcategoryId: null }),
  setSearch: (q) => set({ searchQuery: q }),
  toggleCollapse: (categoryId) =>
    set((s) => {
      const next = new Set(s.collapsed);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return { collapsed: next };
    }),
  setListFilter: (f) => set({ listFilter: f }),
  selectPrompt: (id) => set({ selectedPromptId: id }),
  setCopied: (id) => set({ copiedPromptId: id }),
}));
