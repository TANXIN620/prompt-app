import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 未配置时为 null，所有同步操作自动跳过 */
export const supabase: SupabaseClient | null =
  typeof window !== "undefined" && url && anonKey
    ? createClient(url, anonKey, {
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
