-- 米風亭オーダーアプリ: 客席・厨房が共有する Supabase スキーマ
-- アプリは anon キーで接続し、beifutei_orders / beifutei_table_states に read/write します。
-- id は UUID ではなく文字列（ord-... / nh-ord-...）のため text 主キーにしてください。

-- ---------------------------------------------------------------------------
-- beifutei_orders
-- ---------------------------------------------------------------------------
create table if not exists public.beifutei_orders (
  id text primary key,
  table_label text not null,
  item_id text not null default '',
  item_name text not null default '',
  item_price integer not null default 0,
  status text not null default 'pending',
  is_nomihodai boolean not null default false,
  created_at bigint not null
);

create index if not exists beifutei_orders_table_label_idx
  on public.beifutei_orders (table_label);

create index if not exists beifutei_orders_created_at_idx
  on public.beifutei_orders (created_at);

comment on table public.beifutei_orders is '客席からの注文行（厨房と Realtime で共有）';

-- 既存テーブルで id が uuid の場合は PostgREST がエラーになるため、新規プロジェクト向け。
-- 既に uuid 主キーのテーブルがある場合はダッシュボードで別テーブルに作り直すか、
-- アプリ側を uuid 生成に合わせる必要があります。

-- ---------------------------------------------------------------------------
-- beifutei_table_states
-- ---------------------------------------------------------------------------
create table if not exists public.beifutei_table_states (
  table_label text primary key,
  nomihodai_active boolean not null default false,
  nomihodai_start_ms bigint,
  nomihodai_end_ms bigint,
  nomihodai_people integer not null default 0,
  nomihodai_men integer not null default 0,
  nomihodai_women integer not null default 0,
  nomihodai_bill_total integer not null default 0,
  nomihodai_extension_count integer not null default 0,
  guest_intent_requested_at bigint,
  checkout_requested_at bigint,
  table_memo text,
  guest_farewell_requested_at bigint,
  guest_farewell_completed_at bigint
);

comment on table public.beifutei_table_states is '卓ごとの飲み放題・会計依頼・メモなど（全端末共有）';

-- 列だけ足す（古いテーブル向け）
alter table public.beifutei_table_states
  add column if not exists nomihodai_active boolean not null default false;
alter table public.beifutei_table_states
  add column if not exists nomihodai_start_ms bigint;
alter table public.beifutei_table_states
  add column if not exists nomihodai_end_ms bigint;
alter table public.beifutei_table_states
  add column if not exists nomihodai_people integer not null default 0;
alter table public.beifutei_table_states
  add column if not exists nomihodai_men integer not null default 0;
alter table public.beifutei_table_states
  add column if not exists nomihodai_women integer not null default 0;
alter table public.beifutei_table_states
  add column if not exists nomihodai_bill_total integer not null default 0;
alter table public.beifutei_table_states
  add column if not exists nomihodai_extension_count integer not null default 0;
alter table public.beifutei_table_states
  add column if not exists guest_intent_requested_at bigint;
alter table public.beifutei_table_states
  add column if not exists checkout_requested_at bigint;
alter table public.beifutei_table_states
  add column if not exists table_memo text;
alter table public.beifutei_table_states
  add column if not exists guest_farewell_requested_at bigint;
alter table public.beifutei_table_states
  add column if not exists guest_farewell_completed_at bigint;

-- ---------------------------------------------------------------------------
-- RLS（anon でアプリが動くようにする）
-- 店舗内端末のみでキーを扱う前提の緩いポリシーです。公開 Web に埋め込む場合は見直してください。
-- ---------------------------------------------------------------------------
alter table public.beifutei_orders enable row level security;
alter table public.beifutei_table_states enable row level security;

-- beifutei_orders
drop policy if exists "beifutei_orders_anon_select" on public.beifutei_orders;
create policy "beifutei_orders_anon_select"
  on public.beifutei_orders for select
  to anon, authenticated
  using (true);

drop policy if exists "beifutei_orders_anon_insert" on public.beifutei_orders;
create policy "beifutei_orders_anon_insert"
  on public.beifutei_orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "beifutei_orders_anon_update" on public.beifutei_orders;
create policy "beifutei_orders_anon_update"
  on public.beifutei_orders for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "beifutei_orders_anon_delete" on public.beifutei_orders;
create policy "beifutei_orders_anon_delete"
  on public.beifutei_orders for delete
  to anon, authenticated
  using (true);

-- beifutei_table_states
drop policy if exists "beifutei_table_states_anon_select" on public.beifutei_table_states;
create policy "beifutei_table_states_anon_select"
  on public.beifutei_table_states for select
  to anon, authenticated
  using (true);

drop policy if exists "beifutei_table_states_anon_insert" on public.beifutei_table_states;
create policy "beifutei_table_states_anon_insert"
  on public.beifutei_table_states for insert
  to anon, authenticated
  with check (true);

drop policy if exists "beifutei_table_states_anon_update" on public.beifutei_table_states;
create policy "beifutei_table_states_anon_update"
  on public.beifutei_table_states for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "beifutei_table_states_anon_delete" on public.beifutei_table_states;
create policy "beifutei_table_states_anon_delete"
  on public.beifutei_table_states for delete
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Realtime（既に publication メンバーなら追加しない → 42710 を避ける）
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'beifutei_orders'
  ) then
    execute 'alter publication supabase_realtime add table public.beifutei_orders';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'beifutei_table_states'
  ) then
    execute 'alter publication supabase_realtime add table public.beifutei_table_states';
  end if;
end $$;

alter table public.beifutei_orders replica identity full;
alter table public.beifutei_table_states replica identity full;
