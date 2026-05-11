import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 本番ビルドで VITE_* が埋め込まれているか（未設定だと createClient(undefined) で落ち真っ白になり得る） */
export const isSupabaseConfigured = Boolean(
  typeof rawUrl === 'string' &&
    rawUrl.trim().length > 8 &&
    typeof rawKey === 'string' &&
    rawKey.trim().length > 20,
);

const url = isSupabaseConfigured ? rawUrl.trim() : 'https://placeholder.supabase.co';
const key = isSupabaseConfigured
  ? rawKey.trim()
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(url, key);
