/** 会計確定の日次集計（localStorage・厨房／オーナー画面で共有） */

export const DAILY_LEDGER_STORAGE_KEY = 'beifutei-daily-ledger-v1';
export const LEDGER_SETTINGS_KEY = 'beifutei-ledger-settings-v1';

/** @typedef {{
 *   id: string,
 *   dateKey: string,
 *   recordedAt: number,
 *   tableKey: string,
 *   tableLabel: string,
 *   payment: 'cash'|'card'|'card_5pct',
 *   total: number,
 *   normalSubtotal: number,
 *   nomihodaiPlanYen: number,
 *   normalCount: number,
 *   nomihodaiCount: number,
 *   lines: Array<{ kind?: string, name?: string, price?: number, itemId?: string }>,
 *   hadNomihodaiCheckout?: boolean,
 *   nhStartMs?: number|null,
 *   nhEndMsAtCheckout?: number|null,
 *   extensionCount?: number,
 *   menCount?: number,
 *   womenCount?: number,
 *   people?: number,
 *   stayMinutes?: number|null,
 *   checkoutMemo?: string,
 * }} LedgerEntry */

/** 表示用：卓番とメモを横並びで見せる */
export function formatLedgerTableMemoLine(tableLabel, checkoutMemo) {
  const tl = String(tableLabel ?? '?').trim() || '?';
  const m =
    typeof checkoutMemo === 'string' ? checkoutMemo.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  if (!m) return `テーブル${tl}`;
  return `テーブル${tl}　${m}`;
}

export function getLocalDateKey(ts = Date.now()) {
  return new Date(ts).toLocaleDateString('sv-SE');
}

/** 日計・厨房ログの支払い区分ラベル */
export function formatLedgerPaymentJa(payment) {
  if (payment === 'card_5pct') return 'カード・5%';
  if (payment === 'card') return 'カード';
  return '現金';
}

export function loadLedgerSettings() {
  try {
    const raw = localStorage.getItem(LEDGER_SETTINGS_KEY);
    if (!raw) return { cogsPercent: 35 };
    const p = JSON.parse(raw);
    const n = Number(p.cogsPercent);
    return { cogsPercent: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 35 };
  } catch {
    return { cogsPercent: 35 };
  }
}

export function saveLedgerSettings(settings) {
  const next = {
    cogsPercent: Math.min(100, Math.max(0, Number(settings.cogsPercent) || 0)),
  };
  localStorage.setItem(LEDGER_SETTINGS_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new CustomEvent('beifutei-ledger-settings-updated'));
  } catch {
    /* ignore */
  }
  return next;
}

function broadcastLedgerUpdated() {
  try {
    window.dispatchEvent(new CustomEvent('beifutei-daily-ledger-updated'));
  } catch {
    /* ignore */
  }
}

function isValidEntry(e) {
  return (
    e &&
    typeof e.id === 'string' &&
    typeof e.dateKey === 'string' &&
    (e.payment === 'cash' || e.payment === 'card' || e.payment === 'card_5pct') &&
    Number.isFinite(Number(e.total))
  );
}

export function loadDailyLedger() {
  try {
    const raw = localStorage.getItem(DAILY_LEDGER_STORAGE_KEY);
    if (!raw) return { version: 2, entries: [] };
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.entries)) return { version: 2, entries: [] };
    return { version: 2, entries: p.entries.filter(isValidEntry) };
  } catch {
    return { version: 2, entries: [] };
  }
}

/**
 * @param {object} partial
 * @param {'cash'|'card'|'card_5pct'} partial.payment
 */
export function appendDailyLedgerEntry(partial) {
  const recordedAt =
    partial.recordedAt != null && Number.isFinite(Number(partial.recordedAt))
      ? Number(partial.recordedAt)
      : Date.now();
  const dateKey = getLocalDateKey(recordedAt);
  const nhPlan = Math.max(0, Number(partial.nomihodaiPlanYen) || 0);
  const entry = {
    id: `dl-${recordedAt}-${Math.random().toString(36).slice(2, 9)}`,
    dateKey,
    recordedAt,
    tableKey: String(partial.tableKey || ''),
    tableLabel: String(partial.tableLabel || ''),
    payment:
      partial.payment === 'card_5pct'
        ? 'card_5pct'
        : partial.payment === 'card'
          ? 'card'
          : 'cash',
    total: Math.max(0, Number(partial.total) || 0),
    normalSubtotal: Math.max(0, Number(partial.normalSubtotal) || 0),
    nomihodaiPlanYen: nhPlan,
    normalCount: Math.max(0, Number(partial.normalCount) || 0),
    nomihodaiCount: Math.max(0, Number(partial.nomihodaiCount) || 0),
    lines: Array.isArray(partial.lines) ? partial.lines.slice(0, 200) : [],
    hadNomihodaiCheckout: !!partial.hadNomihodaiCheckout || nhPlan > 0,
    nhStartMs:
      partial.nhStartMs != null && Number.isFinite(Number(partial.nhStartMs))
        ? Number(partial.nhStartMs)
        : null,
    nhEndMsAtCheckout:
      partial.nhEndMsAtCheckout != null && Number.isFinite(Number(partial.nhEndMsAtCheckout))
        ? Number(partial.nhEndMsAtCheckout)
        : null,
    extensionCount: Math.max(0, Number(partial.extensionCount) || 0),
    menCount: Math.max(0, Number(partial.menCount) || 0),
    womenCount: Math.max(0, Number(partial.womenCount) || 0),
    people: Math.max(1, Number(partial.people) || 1),
    stayMinutes:
      partial.stayMinutes != null && Number.isFinite(Number(partial.stayMinutes))
        ? Math.max(0, Math.round(Number(partial.stayMinutes)))
        : null,
    checkoutMemo:
      typeof partial.checkoutMemo === 'string'
        ? partial.checkoutMemo.replace(/\s+/g, ' ').trim().slice(0, 120)
        : '',
  };
  const prev = loadDailyLedger();
  const next = { version: 2, entries: [...prev.entries, entry] };
  localStorage.setItem(DAILY_LEDGER_STORAGE_KEY, JSON.stringify(next));
  broadcastLedgerUpdated();
  return entry;
}

export function summarizeLedgerDay(entries, dateKey) {
  const day = entries.filter((e) => e.dateKey === dateKey);
  let cash = 0;
  let card = 0;
  let grand = 0;
  for (const e of day) {
    grand += e.total;
    if (e.payment === 'card' || e.payment === 'card_5pct') card += e.total;
    else cash += e.total;
  }
  return { count: day.length, cash, card, grand, rows: day };
}
