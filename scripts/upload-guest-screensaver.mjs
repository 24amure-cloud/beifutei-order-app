/**
 * 客席スクリーンセーバー動画を Supabase Storage（公開）へアップロード。
 * 実行: node scripts/upload-guest-screensaver.mjs
 * 必要: .env の VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY（Storage 書き込みポリシー要）
 */
import { readFileSync, existsSync, statSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseAnonKey, normalizeSupabaseProjectUrl } from '../src/supabaseEnv.js';

const BUCKET = 'guest-promo';
const OBJECT_PATH = 'screensaver4.mp4';
const LOCAL_CANDIDATES = ['public/screensaver4.mp4', 'public/screensaver3.mp4'];

function loadEnv() {
  const merged = { ...process.env };
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) merged[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const url = normalizeSupabaseProjectUrl(merged.VITE_SUPABASE_URL || merged.SUPABASE_URL || '');
  const key = normalizeSupabaseAnonKey(
    merged.VITE_SUPABASE_ANON_KEY ||
      merged.SUPABASE_ANON_KEY ||
      merged.SUPABASE_PUBLISHABLE_KEY ||
      '',
  );
  return { url, key };
}

function pickLocalFile() {
  for (const p of LOCAL_CANDIDATES) {
    if (!existsSync(p)) continue;
    const size = statSync(p).size;
    if (size < 50_000) {
      console.warn(`[skip] ${p} は ${size} bytes（LFS 未取得の可能性）`);
      continue;
    }
    return p;
  }
  return null;
}

const { url, key } = loadEnv();
if (!url || !key) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が必要です');
  process.exit(1);
}

const localPath = pickLocalFile();
if (!localPath) {
  console.error('public/screensaver4.mp4 がありません。git lfs pull 後に再実行してください。');
  process.exit(1);
}

const supabase = createClient(url, key);
const body = readFileSync(localPath);
const publicUrl = `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${OBJECT_PATH}`;

console.log(`[upload] ${localPath} (${(body.length / 1024 / 1024).toFixed(1)} MB) → ${BUCKET}/${OBJECT_PATH}`);

const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: 512 * 1024 * 1024,
});
if (bucketErr && !/already exists|Duplicate/i.test(bucketErr.message)) {
  console.warn('[bucket]', bucketErr.message);
}

const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(OBJECT_PATH, body, {
  contentType: 'video/mp4',
  upsert: true,
  cacheControl: '3600',
});

if (uploadErr) {
  console.error('[upload failed]', uploadErr.message);
  console.error('Supabase ダッシュボードで Storage バケット guest-promo（公開）を作成し、');
  console.error('anon から upload 可能なポリシーを設定するか、service_role で実行してください。');
  process.exit(1);
}

console.log('[ok] 公開 URL:');
console.log(publicUrl);
console.log('\nVercel の VITE_GUEST_PROMO_MEDIA に上記 URL を設定するか、ビルド既定（vite.config）を利用してください。');
