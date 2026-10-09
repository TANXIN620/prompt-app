-- ============================================================
-- 提示词管理系统 - Supabase 建表脚本
-- 在 Supabase 控制台左侧 SQL Editor 中整段执行即可
-- ============================================================

-- 分类表
create table if not exists public.categories (
  id text primary key,
  name text not null,
  "parentId" text,
  "sortOrder" int not null default 0,
  "updatedAt" bigint
);

-- 标签表
create table if not exists public.tags (
  id text primary key,
  name text not null,
  color text,
  "updatedAt" bigint
);

-- 提示词表
create table if not exists public.prompts (
  id text primary key,
  code text not null,
  title text not null,
  "categoryId" text not null,
  "subcategoryId" text not null default '',
  content text not null,
  tags text[] not null default '{}',
  note text,
  favorite boolean not null default false,
  "usageCount" int not null default 0,
  "lastUsedAt" bigint,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

-- 开启 RLS（行级安全），允许匿名读写（仅本工具使用，非生产级安全）
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.prompts enable row level security;

create policy "categories allow all" on public.categories
  for all using (true) with check (true);
create policy "tags allow all" on public.tags
  for all using (true) with check (true);
create policy "prompts allow all" on public.prompts
  for all using (true) with check (true);

-- 建索引（可选，加速查询）
create index if not exists idx_prompts_category on public.prompts ("categoryId");
create index if not exists idx_prompts_updated on public.prompts ("updatedAt" desc);
