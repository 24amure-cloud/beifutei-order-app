/**
 * 米風亭オーダー用 Supabase（公開キー・RLS 前提でブラウザに載せてよい値）。
 * Vercel に誤った Publishable（sb_publishable__…）が入っても注文できるようフォールバックする。
 */
export const PROJECT_SUPABASE_URL = 'https://bzzblbubxzpdbwtvrauc.supabase.co';

/** @type {string} publishable / anon（このプロジェクトで REST が通るキー） */
export const PROJECT_PUBLISHABLE_KEY = 'sb_publishable_cZ2aMUugteFFfxy4K0NT5g_ZdpH6ex8';

/** @param {string} key */
export function isInvalidSupabaseAnonKey(key) {
  const k = String(key ?? '').trim();
  if (!k || k.length < 30) return true;
  /** Supabase 画面の default（sb_publishable__j9zo…）は本プロジェクトで 401 */
  if (k.startsWith('sb_publishable__')) return true;
  /** vite 未設定時のデモ用 JWT */
  if (k.startsWith('eyJ') && k.includes('supabase-demo')) return true;
  return false;
}

/** @param {string} url */
export function isWrongSupabaseProjectUrl(url) {
  const u = String(url ?? '').trim();
  if (!u) return true;
  try {
    return !new URL(u).host.includes('bzzblbubxzpdbwtvrauc');
  } catch {
    return true;
  }
}

/**
 * @param {{ url?: string, key?: string }} fromEnv
 * @returns {{ url: string, key: string, usedFallback: boolean }}
 */
export function resolveSupabaseClientConfig(fromEnv = {}) {
  let url = String(fromEnv.url ?? '').trim();
  let key = String(fromEnv.key ?? '').trim();
  let usedFallback = false;

  if (isWrongSupabaseProjectUrl(url)) {
    url = PROJECT_SUPABASE_URL;
    usedFallback = true;
  }
  if (isInvalidSupabaseAnonKey(key)) {
    key = PROJECT_PUBLISHABLE_KEY;
    usedFallback = true;
  }

  return { url, key, usedFallback };
}
