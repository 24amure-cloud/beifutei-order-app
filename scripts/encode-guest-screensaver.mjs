/**
 * 任意の元動画から店舗配信用 public/screensaver4.mp4 を再生成。
 * 実行: npm run encode:screensaver [入力ファイルパス]
 */
import { existsSync, statSync, renameSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const OUT = 'public/screensaver4.mp4';
const TMP = 'public/screensaver4-web.mp4';
const src = process.argv[2] || OUT;

if (!existsSync(src)) {
  console.error('入力動画がありません。例: npm run encode:screensaver -- D:\\promo\\source.mp4');
  process.exit(1);
}

if (statSync(src).size < 10_000) {
  console.error('入力ファイルが小さすぎます（壊れている可能性があります）。');
  process.exit(1);
}

if (!ffmpegPath) {
  console.error('ffmpeg-static が見つかりません');
  process.exit(1);
}

const dest = src === OUT ? TMP : OUT;
console.log(`[encode] ${src} → ${dest} (720p)`);
const r = spawnSync(
  ffmpegPath,
  ['-y', '-i', src, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-crf', '26', '-preset', 'medium', '-movflags', '+faststart', '-an', dest],
  { stdio: 'inherit' },
);

if (r.status !== 0) process.exit(r.status ?? 1);
if (dest === TMP) {
  try {
    unlinkSync(OUT);
  } catch {
    /* ignore */
  }
  renameSync(TMP, OUT);
}
const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`[ok] ${OUT} (${mb} MB)`);
