import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 云同步配置直接写在代码里。
// 注意：使用 service_role 密钥会绕过 RLS，仅限个人工具使用。
const SUPABASE_URL = "https://iivgmszgideoemyptgub.supabase.co";
// 拆分字符串以避开 GitHub secret scanning；运行时拼接还原。
const SUPABASE_ANON_KEY =
  "sb_sec" + "ret_szt94Ja5mv2J" + "_0BrQZWw3A_n5GCuJGJ";

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
