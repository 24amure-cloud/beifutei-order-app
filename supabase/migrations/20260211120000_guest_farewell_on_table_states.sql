-- 客席タブレットの会計後フロー（THANK YOU / SESSION CLOSED）を厨房と共有するための列。
-- 未適用の環境では NomihodaiSessionContext の該当 upsert/update がエラーになるため、必ず Supabase で実行してください。

alter table public.beifutei_table_states
  add column if not exists guest_farewell_requested_at bigint;

alter table public.beifutei_table_states
  add column if not exists guest_farewell_completed_at bigint;

comment on column public.beifutei_table_states.guest_farewell_requested_at is
  '飲み放題会計フロー: 客が会計を依頼した時刻（卓単位・全端末で参照）';

comment on column public.beifutei_table_states.guest_farewell_completed_at is
  '飲み放題会計フロー: 厨房で会計確定した時刻（卓単位・全端末で参照）';
