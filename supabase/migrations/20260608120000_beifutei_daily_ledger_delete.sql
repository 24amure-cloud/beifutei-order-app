-- 日計の削除をクラウドでも永続化（同期で試用データが復活しないようにする）

drop policy if exists "beifutei_daily_ledger_anon_delete" on public.beifutei_daily_ledger;
create policy "beifutei_daily_ledger_anon_delete"
  on public.beifutei_daily_ledger for delete
  to anon, authenticated
  using (true);

create table if not exists public.beifutei_daily_ledger_deletions (
  id text primary key,
  deleted_at timestamptz not null default now()
);

comment on table public.beifutei_daily_ledger_deletions is '日計削除トムストーン（端末間で共有）';

alter table public.beifutei_daily_ledger_deletions enable row level security;

drop policy if exists "beifutei_daily_ledger_deletions_anon_select" on public.beifutei_daily_ledger_deletions;
create policy "beifutei_daily_ledger_deletions_anon_select"
  on public.beifutei_daily_ledger_deletions for select
  to anon, authenticated
  using (true);

drop policy if exists "beifutei_daily_ledger_deletions_anon_insert" on public.beifutei_daily_ledger_deletions;
create policy "beifutei_daily_ledger_deletions_anon_insert"
  on public.beifutei_daily_ledger_deletions for insert
  to anon, authenticated
  with check (true);
