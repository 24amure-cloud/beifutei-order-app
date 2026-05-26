/**
 * 巨大な元動画（LFS の screensaver3 等）から店舗配信用 screensaver4.mp4 を生成。
 * 実行: npm run encode:screensaver
 */
import { existsSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const SOURCES = ['public/screensaver4.mp4', 'public/screensaver3.mp4'];
const OUT = 'public/screensaver4.mp4';
const MIN_SOURCE_BYTES = 50_000_000;

const src = SOURCES.find((p) => {
  if (!existsSync(p)) return false;
  return statSync(p).size >= MIN_SOURCE_BYTES;
});

if (!src) {
  console.error('圧縮元が見つかりません。git lfs pull 後、public/screensaver3.mp4 等を用意してください。');
  process.exit(1);
}

if (!ffmpegPath) {
  console.error('ffmpeg-static が見つかりません');
  process.exit(1);
}

console.log(`[encode] ${src} → ${OUT} (720p)`);
const r = spawnSync(
  ffmpegPath,
  ['-y', '-i', src, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-crf', '26', '-preset', 'medium', '-movflags', '+faststart', '-an', OUT],
  { stdio: 'inherit' },
);

if (r.status !== 0) process.exit(r.status ?? 1);
const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`[ok] ${OUT} (${mb} MB)`);
