/**
 * Supabase 接続用 env の正規化（Vercel 連携で /rest/v1 が付く誤設定を救済）
 */

/** @param {string} raw */
export function normalizeSupabaseProjectUrl(raw) {
  let u = String(raw ?? '').trim();
  if (!u) return '';
  if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
    u = u.slice(1, -1).trim();
  }
  u = u.replace(/\/rest\/v1\/?$/i, '');
  u = u.replace(/\/+$/, '');
  return u;
}

/** @param {string} raw */
export function normalizeSupabaseAnonKey(raw) {
  let k = String(raw ?? '').trim();
  if (!k) return '';
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k;
}
