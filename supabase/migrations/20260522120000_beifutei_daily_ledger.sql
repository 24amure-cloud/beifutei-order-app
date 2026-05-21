-- 会計確定の日計（全端末で共有・localStorage 消失対策）

create table if not exists public.beifutei_daily_ledger (
  id text primary key,
  date_key text not null,
  recorded_at bigint not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists beifutei_daily_ledger_date_key_idx
  on public.beifutei_daily_ledger (date_key);

create index if not exists beifutei_daily_ledger_recorded_at_idx
  on public.beifutei_daily_ledger (recorded_at);

comment on table public.beifutei_daily_ledger is '厨房会計確定の日計行（オーナー画面・カレンダー用）';

alter table public.beifutei_daily_ledger enable row level security;

drop policy if exists "beifutei_daily_ledger_anon_select" on public.beifutei_daily_ledger;
create policy "beifutei_daily_ledger_anon_select"
  on public.beifutei_daily_ledger for select
  to anon, authenticated
  using (true);

drop policy if exists "beifutei_daily_ledger_anon_insert" on public.beifutei_daily_ledger;
create policy "beifutei_daily_ledger_anon_insert"
  on public.beifutei_daily_ledger for insert
  to anon, authenticated
  with check (true);

drop policy if exists "beifutei_daily_ledger_anon_update" on public.beifutei_daily_ledger;
create policy "beifutei_daily_ledger_anon_update"
  on public.beifutei_daily_ledger for update
  to anon, authenticated
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'beifutei_daily_ledger'
  ) then
    execute 'alter publication supabase_realtime add table public.beifutei_daily_ledger';
  end if;
end $$;

alter table public.beifutei_daily_ledger replica identity full;
