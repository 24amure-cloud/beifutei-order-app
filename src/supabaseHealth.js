import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { normalizeSupabaseProjectUrl } from './supabaseEnv.js';

export function getSupabaseProjectHost() {
  try {
    const u = normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL);
    if (!u) return '';
    return new URL(u).host;
  } catch {
    return String(import.meta.env.VITE_SUPABASE_URL || '').slice(0, 48);
  }
}

/** @param {{ code?: string, message?: string } | null | undefined} error */
export function classifySupabaseProbeError(error) {
  if (!error) return 'ok';
  const code = String(error.code || '');
  const msg = String(error.message || '');
  if (code === 'PGRST125' || /Invalid path specified in request URL/i.test(msg)) return 'bad_url';
  if (code === 'PGRST205' || /Could not find the table/i.test(msg)) return 'schema_missing';
  if (code === '42501' || /row-level security|RLS/i.test(msg)) return 'rls';
  if (code === 'PGRST301' || /JWT|invalid api key|Invalid API key/i.test(msg)) return 'auth';
  return 'unknown';
}

/**
 * 起動時の軽量プローブ（beifutei_orders が存在するか）
 * @returns {Promise<{ ok: boolean, kind: string, host: string, detail: string }>}
 */
export async function probeSupabaseOrdersTable() {
  if (!isSupabaseConfigured) {
    return { ok: false, kind: 'unconfigured', host: '', detail: '' };
  }
  const host = getSupabaseProjectHost();
  try {
    const { error } = await supabase.from('beifutei_orders').select('id').limit(1);
    const kind = classifySupabaseProbeError(error);
    return { ok: !error, kind, host, detail: error?.message || '' };
  } catch (e) {
    return { ok: false, kind: 'network', host, detail: String(e?.message || e) };
  }
}

/** 客席の注文失敗トースト用（技術用語を抑える） */
export function guestHintFromSupabaseError(error) {
  const msg = String(error?.message || error || '');
  const code = String(error?.code || '');
  if (code === 'PGRST125' || /Invalid path specified in request URL/i.test(msg)) {
    return '店舗側の設定ミスです（Supabase URL に /rest/v1 が付いている可能性）。スタッフにお知らせください。';
  }
  if (code === 'PGRST205' || /Could not find the table/i.test(msg)) {
    return '店舗側のデータベースが未設定です。スタッフにお知らせください。';
  }
  if (/Invalid API key|JWT/i.test(msg)) {
    return '店舗側の接続キーが誤っています。スタッフにお知らせください。';
  }
  if (/row-level security|RLS/i.test(msg) || code === '42501') {
    return '店舗側の権限設定を確認してください。スタッフにお知らせください。';
  }
  if (/fetch|network|Failed to fetch/i.test(msg)) {
    return '通信が不安定です。しばらくしてから再度お試しください。';
  }
  return 'スタッフにお知らせください。';
}

/** @param {{ ok: boolean, kind: string, host: string, detail?: string }} probe */
export function describeSupabaseConnectionIssue(probe) {
  if (probe.ok || probe.kind === 'ok') return '';
  const host = probe.host ? `（${probe.host}）` : '';
  switch (probe.kind) {
    case 'unconfigured':
      return 'Supabase の URL / 公開キーがビルドに含まれていません。Vercel の環境変数を設定して再デプロイしてください。';
    case 'bad_url':
      return `Supabase の URL の書き方が誤っています${host}。VITE_SUPABASE_URL は https://xxxx.supabase.co までにし、/rest/v1 は付けないでください。Vercel を直したら Redeploy してください。`;
    case 'schema_missing':
      return `接続先の Supabase${host} に注文テーブル（beifutei_orders）がありません。Vercel の VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が、マイグレーション済みの正しいプロジェクトと一致しているか確認し、Redeploy してください。`;
    case 'auth':
      return `Supabase の公開キーが無効です${host}。Vercel の anon / publishable キーを確認し、再デプロイしてください。`;
    case 'rls':
      return `データベースの権限（RLS）で読み取りが拒否されました${host}。Supabase の beifutei_orders ポリシーを確認してください。`;
    case 'network':
      return `サーバーに接続できません${host}。店舗 Wi‑Fi とブラウザのオンライン状態を確認してください。`;
    default:
      return probe.detail
        ? `データベース接続エラー${host}：${probe.detail}`
        : `データベース接続エラー${host}。厨房画面の接続ログを確認してください。`;
  }
}
