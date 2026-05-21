-- 客席タブレット：来店時の男女児人数（オーダー前に入力）

alter table public.beifutei_table_states
  add column if not exists guest_party_men integer not null default 0,
  add column if not exists guest_party_women integer not null default 0,
  add column if not exists guest_party_children integer not null default 0,
  add column if not exists guest_party_captured_at bigint,
  add column if not exists guest_party_locale text;

comment on column public.beifutei_table_states.guest_party_men is '客席入力：男性人数';
comment on column public.beifutei_table_states.guest_party_locale is '客席入力：UI言語 ja|en（日本人/外国人統計の代理）';
comment on column public.beifutei_table_states.guest_party_women is '客席入力：女性人数';
comment on column public.beifutei_table_states.guest_party_children is '客席入力：子供人数';
comment on column public.beifutei_table_states.guest_party_captured_at is '客席入力確定時刻（ms）';
