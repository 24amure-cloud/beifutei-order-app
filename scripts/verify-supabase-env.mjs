/**
 * ビルド前チェック: Vercel / ローカルで Supabase キーが実際に使えるか検証する。
 * ダッシュボードの default（sb_publishable__j9zo…）は 401 になるため、誤設定を防ぐ。
 */
import { readFileSync, existsSync } from 'fs';
import { normalizeSupabaseAnonKey, normalizeSupabaseProjectUrl } from '../src/supabaseEnv.js';

function loadMergedEnv() {
  const merged = { ...process.env };
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) merged[m[1]] = m[2].trim();
    }
  }
  const url = normalizeSupabaseProjectUrl(
    merged.VITE_SUPABASE_URL || merged.SUPABASE_URL || '',
  );
  const key = normalizeSupabaseAnonKey(
    merged.VITE_SUPABASE_ANON_KEY ||
      merged.SUPABASE_ANON_KEY ||
      merged.SUPABASE_PUBLISHABLE_KEY ||
      merged.SUPABASE_KEY ||
      '',
  );
  return { url, key };
}

const { url, key } = loadMergedEnv();

if (!url || !key) {
  console.error('\n[beifutei] ビルド中止: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が未設定です。\n');
  process.exit(1);
}

const prefix = key.slice(0, 22);
console.log(`[beifutei] Supabase 検証: ${new URL(url).host}  key=${prefix}…`);

if (key.startsWith('sb_publishable__')) {
  console.warn(
    '[beifutei] 警告: Vercel のキーは無効ですが、ビルド時に店舗用フォールバックキーへ差し替えます。',
  );
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const res = await fetch(`${url}/rest/v1/beifutei_orders?select=id&limit=1`, { headers });
const body = await res.text();

if (res.status !== 200) {
  console.error(`\n[beifutei] ビルド中止: Supabase がキーを拒否しました (${res.status})`);
  console.error(body.slice(0, 200));
  console.error('\nVercel の VITE_SUPABASE_ANON_KEY が .env 2行目と完全一致しているか確認してください。\n');
  process.exit(1);
}

console.log('[beifutei] Supabase 接続 OK — ビルドを続行します。\n');
