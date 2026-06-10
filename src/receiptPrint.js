import { getAlcoholTableCharge } from './alcoholTableCharge.js';
import { getNomihodaiForTable } from './nomihodaiSession.js';

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

/** レシート印刷用の支払い表示（5%は別行で表示） */
function formatReceiptPaymentJa(payment) {
  if (payment === 'card' || payment === 'card_5pct') return 'カード';
  if (payment === 'detail') return '明細のみ';
  return '現金';
}

function formatReceiptTimeRange(startMs, endMs) {
  const start = Number(startMs);
  const end = Number(endMs);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) return null;
  const fmt = (ms) =>
    new Date(ms).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(start)}〜${fmt(end)}`;
}

function buildReceiptTotals(pay, baseTotal) {
  const base = Math.max(0, Number(baseTotal) || 0);
  const total = pay === 'card_5pct' ? Math.ceil(base * 1.05) : base;
  const cardFee = pay === 'card_5pct' ? total - base : 0;
  return { baseTotal: base, total, cardFee };
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
      }
      continue;
    }
    lines.push({ name, priceLabel: formatYen(yen), sub: null });
  }

  const nh = getNomihodaiForTable(session, tl);
  const planYen = Math.max(0, Number(checkoutSlip?.nomihodaiPlanYen) || 0);
  if (planYen > 0) {
    const planTime = formatReceiptTimeRange(nh?.startMs, nh?.endMs);
    lines.push({
      name: '飲み放題プラン',
      priceLabel: formatYen(planYen),
      sub: planTime,
    });
  }

  const acYen = Math.max(0, Number(checkoutSlip?.alcoholChargeYen) || 0);
  if (acYen > 0) {
    const ac = getAlcoholTableCharge(session, tl);
    lines.push({ name: ac.lineName || '卓チャージ', priceLabel: formatYen(acYen), sub: null });
  }

  const { baseTotal, total, cardFee } = buildReceiptTotals(pay, checkoutSlip?.slipGrandTotal);

  void memo;
  return {
    storeName: STORE_NAME,
    tableLabel: tl,
    payment: pay,
    paymentLabel: formatReceiptPaymentJa(pay),
    recordedAt: recordedAt ?? Date.now(),
    lines,
    normalSubtotal: checkoutSlip?.normalSubtotal ?? 0,
    nomihodaiPlanYen: planYen,
    baseTotal,
    cardFee,
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
    if (kind === 'nh') continue;
    if (kind === 'nh_extra') {
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
    const planTime = formatReceiptTimeRange(entry.nhStartMs, entry.nhEndMsAtCheckout);
    lines.push({
      name: '飲み放題プラン',
      priceLabel: formatYen(planYen),
      sub: planTime,
    });
  }

  const baseTotal =
    Math.max(0, Number(entry.normalSubtotal) || 0) +
    planYen +
    Math.max(0, Number(entry.alcoholChargeYen) || 0);
  const { total, cardFee } = buildReceiptTotals(pay, baseTotal);

  return {
    storeName: STORE_NAME,
    tableLabel: String(entry.tableLabel ?? '?'),
    payment: pay,
    paymentLabel: formatReceiptPaymentJa(pay),
    recordedAt: entry.recordedAt ?? Date.now(),
    lines,
    normalSubtotal: entry.normalSubtotal ?? 0,
    nomihodaiPlanYen: planYen,
    baseTotal,
    cardFee,
    total: Math.max(0, Number(entry.total) || total),
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

function summaryRow(label, value, bodySize) {
  if (!value) return '';
  return `<div class="sum-row" style="font-size:${bodySize}px">
    <span class="sum-label">${escapeHtml(label)}</span>
    <span class="sum-value">${escapeHtml(value)}</span>
  </div>`;
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
        ? `<div class="line-sub" style="font-size:${bodySize - 4}px">${escapeHtml(ln.sub)}</div>`
        : '';
      const priceCell = ln.priceLabel
        ? `<div class="price">${escapeHtml(ln.priceLabel)}</div>`
        : '<div class="price"></div>';
      return `<div class="row">
        <div class="name">${escapeHtml(ln.name)}${sub}</div>
        ${priceCell}
      </div>`;
    })
    .join('');

  const detailNote = payload.detailOnly
    ? '<p class="note">※お支払いはスマレジ等で承ります（明細のみ）</p>'
    : '';

  const cardFeeRow =
    payload.cardFee > 0
      ? summaryRow('TAX5％', formatYen(payload.cardFee), bodySize - 1)
      : '';

  const taxNote = payload.detailOnly ? '' : '<p class="tax-note">※表示金額は税込です</p>';

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="format-detection" content="telephone=no">
<style>
body{font-family:Helvetica,'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif;width:384px;margin:0;padding:12px 10px;font-size:${bodySize}px;line-height:1.4;color:#000;background:#fff}
.store{text-align:center;font-weight:700;font-size:24px;margin:0 0 4px;letter-spacing:0.03em}
.shop{text-align:center;font-size:14px;margin:0 0 2px;color:#222}
.doc-title{text-align:center;font-size:28px;font-weight:800;margin:14px 0 10px;letter-spacing:0.35em;padding-left:0.35em;border:2px solid #000;padding:8px 4px}
.meta{font-size:17px;color:#222;margin:2px 0}
.meta-pay{display:flex;justify-content:space-between;align-items:center;margin:8px 0 2px;font-size:18px}
.pay-badge{border:1px solid #000;padding:2px 10px;font-weight:700}
.row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px}
.name{flex:1;word-break:break-all}
.line-sub{color:#444;margin-top:2px}
.price{white-space:nowrap;font-weight:700;text-align:right;min-width:5.5em}
hr{border:none;border-top:1px dashed #000;margin:10px 0}
hr.solid{border-top:2px solid #000}
.sum-row{display:flex;justify-content:space-between;align-items:center;margin:4px 0}
.sum-label{color:#333}
.sum-value{font-weight:700;white-space:nowrap}
.total-box{border:2px solid #000;margin-top:10px;padding:10px 8px}
.total-label{font-size:17px;margin:0 0 4px}
.total-yen{font-size:30px;font-weight:800;text-align:right;margin:0;letter-spacing:0.02em}
.receipt-stamp{text-align:center;font-size:17px;margin:14px 0 6px;font-weight:700}
.thanks{text-align:center;font-size:17px;margin:8px 0 0}
.note{margin-top:10px;font-size:16px;color:#333}
.tax-note{text-align:center;font-size:15px;color:#444;margin:10px 0 0}
</style>
</head><body>
<p class="store">${escapeHtml(RECEIPT_STORE.title)}</p>
${RECEIPT_STORE.subtitle ? `<p class="shop">${escapeHtml(RECEIPT_STORE.subtitle)}</p>` : ''}
<p class="shop">TEL ${escapeHtml(RECEIPT_STORE.phone)}</p>
<p class="shop">${escapeHtml(RECEIPT_STORE.address)}</p>
<p class="doc-title">領収書</p>
<p class="meta">${escapeHtml(when)}</p>
<div class="meta-pay">
  <span>卓 ${escapeHtml(payload.tableLabel)}</span>
  <span class="pay-badge">${escapeHtml(payload.paymentLabel)}</span>
</div>
<hr>
${lineRows || '<p class="meta">（明細行なし）</p>'}
<hr class="solid">
${summaryRow('小計', formatYen(payload.baseTotal), bodySize - 1)}
${cardFeeRow}
<div class="total-box">
  <p class="total-label">合計金額（税込）</p>
  <p class="total-yen">${escapeHtml(formatYen(payload.total))}</p>
</div>
${taxNote}
${detailNote}
<p class="receipt-stamp">上記正に領収いたしました</p>
<p class="thanks">ありがとうございました</p>
</body></html>`;
}


/** プレビュー用のサンプル伝票（実際の印刷イメージ確認用） */
export function buildSampleReceiptPayload() {
  const startMs = Date.now() - 75 * 60 * 1000;
  const endMs = startMs + 90 * 60 * 1000;
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
    session: {
      nomihodaiByLabel: {
        3: { active: true, startMs, endMs, billTotal: 3500 },
      },
    },
    tableLabel: '3',
    payment: 'card_5pct',
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
