import { formatLedgerPaymentJa } from './dailyLedger.js';
import { getAlcoholTableCharge } from './alcoholTableCharge.js';

/** レシート・会計伝票の店舗ヘッダー */
export const RECEIPT_STORE = {
  title: 'しあわせ研究所　yum',
  subtitle: '',
  phone: '0144-82-8377',
  address: '北海道苫小牧市表町2-1-17',
};

const STORE_NAME =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RECEIPT_STORE_NAME) ||
  RECEIPT_STORE.title;

/** PassPRNT URL 長の安全上限（iOS のカスタム URL 制限対策） */
const PASSPRNT_URI_SAFE_MAX = 11000;
const RECEIPT_LINE_CAP = 36;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemDisplayName(itemName) {
  return String(itemName || '')
    .split('\n')[0]
    .trim()
    .slice(0, 42);
}

function formatYen(n) {
  return `￥${Math.max(0, Number(n) || 0).toLocaleString()}`;
}

/**
 * 会計ページの伝票からレシート用データを組み立てる
 * @param {{
 *   checkoutSlip: object,
 *   session: object,
 *   tableLabel: string,
 *   memo?: string,
 *   payment: 'cash'|'card'|'card_5pct'|'detail',
 *   recordedAt?: number,
 * }} input
 */
export function buildSlipReceiptPayload({ checkoutSlip, session, tableLabel, memo, payment, recordedAt }) {
  const tl = String(tableLabel);
  const pay =
    payment === 'card_5pct' ? 'card_5pct' : payment === 'card' ? 'card' : payment === 'detail' ? 'detail' : 'cash';

  const lines = [];
  for (const o of checkoutSlip?.orders || []) {
    const name = itemDisplayName(o.itemName);
    const yen = Math.max(0, Number(o.itemPrice) || 0);
    if (o.isNomihodai) {
      if (yen > 0) {
        lines.push({ name, priceLabel: formatYen(yen), sub: '飲み放題・別料金' });
      } else {
        lines.push({ name, priceLabel: 'プラン内', sub: '飲み放題' });
      }
    } else {
      lines.push({ name, priceLabel: formatYen(yen), sub: null });
    }
  }

  const planYen = Math.max(0, Number(checkoutSlip?.nomihodaiPlanYen) || 0);
  if (planYen > 0) {
    lines.push({ name: '飲み放題プラン', priceLabel: formatYen(planYen), sub: null });
  }

  const acYen = Math.max(0, Number(checkoutSlip?.alcoholChargeYen) || 0);
  if (acYen > 0) {
    const ac = getAlcoholTableCharge(session, tl);
    lines.push({ name: ac.lineName || '卓チャージ', priceLabel: formatYen(acYen), sub: null });
  }

  const baseTotal = Math.max(0, Number(checkoutSlip?.slipGrandTotal) || 0);
  const total = pay === 'card_5pct' ? Math.ceil(baseTotal * 1.05) : baseTotal;

  void memo;
  return {
    storeName: STORE_NAME,
    tableLabel: tl,
    payment: pay,
    paymentLabel: pay === 'detail' ? '明細のみ' : formatLedgerPaymentJa(pay),
    recordedAt: recordedAt ?? Date.now(),
    lines,
    normalCount: checkoutSlip?.normalCount ?? 0,
    nomihodaiCount: checkoutSlip?.nomihodaiCount ?? 0,
    normalSubtotal: checkoutSlip?.normalSubtotal ?? 0,
    nomihodaiPlanYen: planYen,
    total,
    detailOnly: pay === 'detail',
  };
}

/**
 * お会計済みログ（日計エントリ）から再印刷用データを組み立てる
 * @param {import('./dailyLedger.js').LedgerEntry} entry
 */
export function buildLedgerReceiptPayload(entry) {
  const pay = entry.payment === 'card_5pct' ? 'card_5pct' : entry.payment === 'card' ? 'card' : 'cash';
  const lines = [];

  for (const line of Array.isArray(entry.lines) ? entry.lines : []) {
    const kind = line?.kind;
    const name = itemDisplayName(line?.name);
    if (!name) continue;
    if (kind === 'nh') {
      lines.push({ name, priceLabel: 'プラン内', sub: '飲み放題' });
    } else if (kind === 'nh_extra') {
      lines.push({
        name,
        priceLabel: formatYen(line.price),
        sub: '飲み放題・別料金',
      });
    } else if (kind === 'alcohol_charge') {
      lines.push({ name, priceLabel: formatYen(line.price), sub: null });
    } else {
      lines.push({ name, priceLabel: formatYen(line.price), sub: null });
    }
  }

  const planYen = Math.max(0, Number(entry.nomihodaiPlanYen) || 0);
  if (planYen > 0 && !lines.some((l) => l.name === '飲み放題プラン')) {
    lines.push({ name: '飲み放題プラン', priceLabel: formatYen(planYen), sub: null });
  }

  return {
    storeName: STORE_NAME,
    tableLabel: String(entry.tableLabel ?? '?'),
    payment: pay,
    paymentLabel: formatLedgerPaymentJa(pay),
    recordedAt: entry.recordedAt ?? Date.now(),
    lines,
    normalCount: entry.normalCount ?? 0,
    nomihodaiCount: entry.nomihodaiCount ?? 0,
    normalSubtotal: entry.normalSubtotal ?? 0,
    nomihodaiPlanYen: planYen,
    total: Math.max(0, Number(entry.total) || 0),
    detailOnly: false,
  };
}

function capReceiptLines(lines) {
  const list = Array.isArray(lines) ? lines : [];
  if (list.length <= RECEIPT_LINE_CAP) return { lines: list, truncated: 0 };
  const kept = list.slice(0, RECEIPT_LINE_CAP);
  const rest = list.length - RECEIPT_LINE_CAP;
  kept.push({ name: `…他 ${rest}品`, priceLabel: '', sub: null });
  return { lines: kept, truncated: rest };
}

/**
 * @param {ReturnType<typeof buildSlipReceiptPayload>} payload
 * @param {{ compact?: boolean }} [opts]
 */
export function buildReceiptHtml(payload, opts = {}) {
  const dt = new Date(payload.recordedAt);
  const when = dt.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { lines } = capReceiptLines(payload.lines);
  const bodySize = opts.compact ? 20 : 22;

  const lineRows = lines
    .map((ln) => {
      const sub = ln.sub
        ? `<div style="font-size:${bodySize - 4}px;color:#444">${escapeHtml(ln.sub)}</div>`
        : '';
      const priceCell = ln.priceLabel
        ? `<div class="price">${escapeHtml(ln.priceLabel)}</div>`
        : '<div class="price"></div>';
      return `<div class="row" style="margin-bottom:5px">
        <div class="name">${escapeHtml(ln.name)}${sub}</div>
        ${priceCell}
      </div>`;
    })
    .join('');

  const detailNote = payload.detailOnly
    ? '<div style="margin-top:10px;font-size:18px">※お支払いはスマレジ等で承ります（明細のみ）</div>'
    : '';

  const planLine =
    payload.nomihodaiPlanYen > 0
      ? `<div class="meta">飲み放題プラン ${formatYen(payload.nomihodaiPlanYen)}</div>`
      : '';

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="format-detection" content="telephone=no">
<style>
body{font-family:Helvetica,'Hiragino Sans',sans-serif;width:384px;margin:0;padding:10px 8px;font-size:${bodySize}px;line-height:1.35;color:#000}
.h{text-align:center;font-weight:700;font-size:26px;margin:0 0 2px}
.brand{text-align:center;font-size:17px;font-weight:700;margin:0 0 6px;letter-spacing:0.02em}
.shop{text-align:center;font-size:15px;margin:0 0 2px;color:#222}
.subh{text-align:center;font-size:20px;margin:10px 0 8px;font-weight:700}
.row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.name{flex:1;word-break:break-all}
.price{white-space:nowrap;font-weight:700;text-align:right}
hr{border:none;border-top:2px dashed #000;margin:10px 0}
.total{font-size:26px;font-weight:800;text-align:right;margin-top:8px}
.meta{font-size:18px;color:#333}
</style>
</head><body>
<p class="h">${escapeHtml(RECEIPT_STORE.title)}</p>
${RECEIPT_STORE.subtitle ? `<p class="brand">${escapeHtml(RECEIPT_STORE.subtitle)}</p>` : ''}
<p class="shop">${escapeHtml(RECEIPT_STORE.phone)}</p>
<p class="shop">${escapeHtml(RECEIPT_STORE.address)}</p>
<p class="subh">お会計明細</p>
<p class="meta">${escapeHtml(when)}</p>
<p class="meta">卓 ${escapeHtml(payload.tableLabel)}　${escapeHtml(payload.paymentLabel)}</p>
<hr>
${lineRows || '<p>（明細行なし）</p>'}
<hr>
<p class="meta">通常 ${payload.normalCount}点 / 飲み放題 ${payload.nomihodaiCount}点</p>
<p class="meta">通常小計 ${formatYen(payload.normalSubtotal)}</p>
${planLine}
<p class="total">合計 ${formatYen(payload.total)}</p>
${detailNote}
<p style="text-align:center;margin-top:14px;font-size:18px">ありがとうございました</p>
</body></html>`;
}


/** プレビュー用のサンプル伝票（実際の印刷イメージ確認用） */
export function buildSampleReceiptPayload() {
  return buildSlipReceiptPayload({
    checkoutSlip: {
      orders: [
        { itemName: '醤油ラーメン', itemPrice: 980, isNomihodai: false },
        { itemName: 'ハイボール', itemPrice: 0, isNomihodai: true },
        { itemName: '唐揚げ', itemPrice: 580, isNomihodai: false },
      ],
      normalCount: 2,
      nomihodaiCount: 1,
      normalSubtotal: 1560,
      nomihodaiPlanYen: 3500,
      alcoholChargeYen: 500,
      slipGrandTotal: 5560,
    },
    session: {},
    tableLabel: '3',
    payment: 'cash',
  });
}

/**
 * レシート HTML をブラウザの別タブで開く（PassPRNT なしでもデザイン確認可）
 * @param {ReturnType<typeof buildSlipReceiptPayload>} payload
 */
export function openReceiptHtmlPreview(payload) {
  const html = buildReceiptHtml(payload);
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
      return { ok: true };
    }
  } catch {
    /* fallback below */
  }
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    return { ok: false, error: 'popup_blocked' };
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  return { ok: true };
}

export function receiptPreviewBlockedMessageJa() {
  return 'プレビューを開けませんでした。ポップアップを許可するか、もう一度お試しください。';
}

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
  uri += `back=${back}`;
  uri += `&html=${encodeURIComponent(html)}`;
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

