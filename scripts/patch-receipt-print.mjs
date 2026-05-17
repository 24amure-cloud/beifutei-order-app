import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/receiptPrint.js');
let s = fs.readFileSync(p, 'utf8');
const D = 'di' + 'v';

s = s.replace(/<\/?motion\b[^>]*>/g, (tag) => {
  if (tag.startsWith('</')) return '</' + D + '>';
  const cls = tag.match(/class="[^"]+"/);
  const style = tag.match(/style="[^"]+"/);
  const attrs = [cls, style].filter(Boolean).join(' ');
  return attrs ? '<' + D + ' ' + attrs + '>' : '<' + D + '>';
});

const tail = `

export function canUsePassPrnt() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function buildPassPrntUri(payload, { openDrawer = false, compact = false } = {}) {
  const html = buildReceiptHtml(payload, { compact });
  const back = encodeURIComponent(window.location.href.split('#')[0]);
  let uri = 'starpassprnt://v1/print/nopreview?';
  uri += \`back=\${back}\`;
  uri += \`&html=\${encodeURIComponent(html)}\`;
  uri += '&size=3';
  uri += '&cut=partial';
  if (openDrawer) uri += '&drawer=after';
  return { uri, html };
}

/**
 * PassPRNT を起動して印刷（要：App Store の PassPRNT、mPOP を Bluetooth 接続済み）
 * @see https://www.star-m.jp/products/s_print/sdk/passprnt/manual/ios/en/data_specifications.html
 */
export function launchPassPrntPrint(payload, { openDrawer = false } = {}) {
  if (!canUsePassPrnt()) {
    return { ok: false, error: 'not_ios' };
  }

  let attempt = buildPassPrntUri(payload, { openDrawer, compact: false });
  if (attempt.uri.length > PASSPRNT_URI_SAFE_MAX) {
    attempt = buildPassPrntUri(payload, { openDrawer, compact: true });
  }
  if (attempt.uri.length > PASSPRNT_URI_SAFE_MAX) {
    return { ok: false, error: 'too_long', lineCount: payload.lines?.length ?? 0 };
  }

  window.location.href = attempt.uri;
  return { ok: true };
}

export function passPrntErrorMessageJa(error) {
  if (error === 'not_ios') {
    return 'レシート印刷は iPad（PassPRNT アプリ）からのみ利用できます。';
  }
  if (error === 'too_long') {
    return '明細が長すぎて印刷データを送れません。品目を分けて印刷するか、画面の伝票をご確認ください。';
  }
  return 'レシート印刷を開始できませんでした。PassPRNT がインストールされ、mPOP が接続されているか確認してください。';
}

/**
 * 印刷を試行し、失敗時はアラート（not_ios は開発PCでは黙ってスキップ）
 */
export function printReceiptWithFeedback(payload, { openDrawer = false, silentNotIos = true } = {}) {
  const res = launchPassPrntPrint(payload, { openDrawer });
  if (res.ok) return res;
  if (res.error === 'not_ios' && silentNotIos) return res;
  if (typeof window !== 'undefined') {
    window.alert(passPrntErrorMessageJa(res.error));
  }
  return res;
}

/** 現金会計時はレシート＋ドロワー、それ以外は必要に応じて呼び出し */
export function shouldPrintAfterCheckout(payment) {
  return payment === 'cash';
}
`;

if (!s.includes('export function canUsePassPrnt')) {
  s += tail;
}

fs.writeFileSync(p, s);
console.log('patched receiptPrint.js');
