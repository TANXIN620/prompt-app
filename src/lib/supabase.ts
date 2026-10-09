import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 云同步配置直接写在代码里（publishable key 本就可公开，无需走 GitHub Secrets）
const SUPABASE_URL = "https://iivgmszgideoemyptgub.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_In_N9g-hgnGs27Th88CYEg_egyBbSXO";

/** 未配置时为 null，所有同步操作自动跳过 */
export const supabase: SupabaseClient | null =
  typeof window !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      })
    : null;

export const isCloudEnabled = Boolean(supabase);

/** 云端表名（与本地 IndexedDB 表同名） */
export const CLOUD_TABLES = {
  categories: "categories",
  tags: "tags",
  prompts: "prompts",
} as const;
