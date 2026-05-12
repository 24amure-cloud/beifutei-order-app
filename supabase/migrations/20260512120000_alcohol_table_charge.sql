-- 卓ごとの卓チャージ（スタッフが人数・1名あたり円を設定）

alter table public.beifutei_table_states
  add column if not exists alcohol_charge_people integer not null default 0;

alter table public.beifutei_table_states
  add column if not exists alcohol_charge_yen_per_person integer not null default 0;

comment on column public.beifutei_table_states.alcohol_charge_people is
  '卓チャージ対象人数（スタッフ設定）';

comment on column public.beifutei_table_states.alcohol_charge_yen_per_person is
  '1名あたり卓チャージ税込円（店舗入力・0で未設定）';
