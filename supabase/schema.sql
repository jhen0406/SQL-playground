-- SQL 練功房：帳號同步用的資料表
-- 在 Supabase 後台 → SQL Editor → New query，貼上整份內容後按 Run（只需執行一次）。

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security：每個人只能讀寫自己的那一列
alter table public.user_data enable row level security;

drop policy if exists "read own data"   on public.user_data;
drop policy if exists "insert own data" on public.user_data;
drop policy if exists "update own data" on public.user_data;

create policy "read own data" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "insert own data" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "update own data" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
