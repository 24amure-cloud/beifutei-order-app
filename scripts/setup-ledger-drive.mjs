#!/usr/bin/env node
/**
 * 日計 Drive 連携の初期値を .env に書き込み、GAS の Code.gs をシークレットで更新する。
 * 使い方: node scripts/setup-ledger-drive.mjs [DriveフォルダID]
 */
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const gasPath = join(root, 'scripts', 'gas-ledger-upload', 'Code.gs');
const folderId = process.argv[2]?.trim() || 'PASTE_DRIVE_FOLDER_ID_HERE';

function readEnv() {
  if (!existsSync(envPath)) return '';
  return readFileSync(envPath, 'utf8');
}

function upsertEnvLine(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) return text.replace(re, line);
  return `${text.trimEnd()}\n${line}\n`;
}

let envText = readEnv();
let secret = envText.match(/^VITE_LEDGER_DRIVE_WEBHOOK_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) {
  secret = randomBytes(24).toString('base64url');
  envText = upsertEnvLine(envText, 'VITE_LEDGER_DRIVE_WEBHOOK_SECRET', secret);
}
if (!/^VITE_LEDGER_DRIVE_WEBHOOK_URL=/m.test(envText)) {
  envText = upsertEnvLine(envText, '# VITE_LEDGER_DRIVE_WEBHOOK_URL', '');
  envText += '# ↑ GASデプロイ後に URL を入れてコメント(#)を外す\n';
}
writeFileSync(envPath, envText, 'utf8');

let gas = readFileSync(gasPath, 'utf8');
gas = gas.replace(/const FOLDER_ID = '[^']*';/m, `const FOLDER_ID = '${folderId}';`);
gas = gas.replace(/const WEBHOOK_SECRET = '[^']*';/m, `const WEBHOOK_SECRET = '${secret}';`);
if (folderId && !folderId.startsWith('PASTE_')) {
  envText = upsertEnvLine(envText, 'VITE_LEDGER_DRIVE_FOLDER_ID', folderId);
}
writeFileSync(gasPath, gas, 'utf8');

console.log('');
console.log('=== 日計 Google Drive セットアップ ===');
console.log('');
console.log('1. .env にシークレットを書き込みました:');
console.log(`   VITE_LEDGER_DRIVE_WEBHOOK_SECRET=${secret}`);
console.log('');
console.log('2. scripts/gas-ledger-upload/Code.gs を更新しました（FOLDER_ID / SECRET）');
console.log('');
console.log('3. 次のどちらかで GAS をデプロイ:');
console.log('   A) https://script.google.com → 新規 → Code.gs に貼り付け → デプロイ → ウェブアプリ');
console.log('   B) cd scripts/gas-ledger-upload && npx clasp login && npx clasp create --title beifutei-ledger');
console.log('      → npx clasp push && npx clasp deploy --description ledger');
console.log('');
console.log('4. デプロイ URL を .env の VITE_LEDGER_DRIVE_WEBHOOK_URL と');
console.log('   オーナー画面「日計管理」→ Drive設定 に貼り付け');
console.log('');
console.log('5. Vercel: Project → Settings → Environment Variables に同じ2変数を追加して再デプロイ');
console.log('');
