import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseAnonKey, normalizeSupabaseProjectUrl } from './supabaseEnv.js';
import { resolveSupabaseClientConfig } from './supabaseProjectDefaults.js';

const { url, key, usedFallback } = resolveSupabaseClientConfig({
  url: normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL),
  key: normalizeSupabaseAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY),
});

if (usedFallback && typeof console !== 'undefined') {
  console.warn(
    '[beifutei] Supabase: Vercel/env の URL またはキーが無効なため、店舗用プロジェクトの公開キーにフォールバックしました。',
  );
}

export const isSupabaseConfigured = Boolean(url.length > 8 && key.length > 20);

export const supabase = createClient(url, key);

/** 診断表示用 */
export const supabaseConfigMeta = { url, keyPrefix: key.slice(0, 22), usedFallback };
