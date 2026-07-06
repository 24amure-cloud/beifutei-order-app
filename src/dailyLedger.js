/** 会計確定の日次集計（localStorage・厨房／オーナー画面で共有） */

export const DAILY_LEDGER_STORAGE_KEY = 'beifutei-daily-ledger-v1';
export const DAILY_LEDGER_BACKUP_KEY = 'beifutei-daily-ledger-backup-v1';
export const DAILY_LEDGER_DELETED_IDS_KEY = 'beifutei-daily-ledger-deleted-v1';
export const LEDGER_SETTINGS_KEY = 'beifutei-ledger-settings-v1';

const MAX_DELETED_LEDGER_IDS = 8000;

/** @returns {Set<string>} */
export function loadDeletedLedgerIds() {
  try {
    const raw = localStorage.getItem(DAILY_LEDGER_DELETED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id)).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function persistDeletedLedgerIds(deletedIds) {
  const ids = [...deletedIds].slice(-MAX_DELETED_LEDGER_IDS);
  localStorage.setItem(DAILY_LEDGER_DELETED_IDS_KEY, JSON.stringify(ids));
}

/** クラウド由来の削除 ID をローカル tombstone に取り込む */
export function mergeDeletedLedgerIds(remoteIds) {
  if (!remoteIds?.size) return loadDeletedLedgerIds();
  const deletedIds = loadDeletedLedgerIds();
  let changed = false;
  for (const id of remoteIds) {
    const s = String(id || '').trim();
    if (!s || deletedIds.has(s)) continue;
    deletedIds.add(s);
    changed = true;
  }
  if (changed) persistDeletedLedgerIds(deletedIds);
  return deletedIds;
}

export function recordDeletedLedgerId(entryId) {
  const id = String(entryId || '').trim();
  if (!id) return;
  const deletedIds = loadDeletedLedgerIds();
  if (deletedIds.has(id)) return;
  deletedIds.add(id);
  persistDeletedLedgerIds(deletedIds);
}

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
 *   alcoholChargeYen?: number,
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
 *   partyMen?: number,
 *   partyWomen?: number,
 *   partyChildren?: number,
 *   guestUiLocale?: 'ja'|'en',
 *   orderSource?: 'table'|'staff_retail'|'manual',
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

export function isValidEntry(e) {
  return (
    e &&
    typeof e.id === 'string' &&
    typeof e.dateKey === 'string' &&
    (e.payment === 'cash' || e.payment === 'card' || e.payment === 'card_5pct') &&
    Number.isFinite(Number(e.total))
  );
}

function readLedgerStore(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.entries)) return [];
    return p.entries.filter(isValidEntry);
  } catch {
    return [];
  }
}

export function loadDailyLedger() {
  const deletedIds = loadDeletedLedgerIds();
  const primary = readLedgerStore(DAILY_LEDGER_STORAGE_KEY).filter((e) => !deletedIds.has(e.id));
  const backup = readLedgerStore(DAILY_LEDGER_BACKUP_KEY).filter((e) => !deletedIds.has(e.id));
  if (backup.length === 0) return { version: 2, entries: primary };
  const map = new Map();
  for (const e of backup) map.set(e.id, e);
  for (const e of primary) map.set(e.id, e);
  const entries = Array.from(map.values())
    .filter((e) => !deletedIds.has(e.id))
    .sort((a, b) => a.recordedAt - b.recordedAt);
  return { version: 2, entries };
}

/** @param {LedgerEntry[]} entries */
export function persistDailyLedgerEntries(entries) {
  const deletedIds = loadDeletedLedgerIds();
  const next = {
    version: 2,
    entries: entries.filter((e) => isValidEntry(e) && !deletedIds.has(e.id)),
  };
  const body = JSON.stringify(next);
  localStorage.setItem(DAILY_LEDGER_STORAGE_KEY, body);
  try {
    localStorage.setItem(DAILY_LEDGER_BACKUP_KEY, body);
  } catch {
    /* ignore */
  }
  broadcastLedgerUpdated();
  return next;
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
  const alcoholYen = Math.max(0, Number(partial.alcoholChargeYen) || 0);
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
    alcoholChargeYen: alcoholYen,
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
    partyMen: Math.max(0, Math.floor(Number(partial.partyMen) || 0)),
    partyWomen: Math.max(0, Math.floor(Number(partial.partyWomen) || 0)),
    partyChildren: Math.max(0, Math.floor(Number(partial.partyChildren) || 0)),
    guestUiLocale: partial.guestUiLocale === 'en' ? 'en' : partial.guestUiLocale === 'ja' ? 'ja' : undefined,
    orderSource:
      partial.orderSource === 'staff_retail'
        ? 'staff_retail'
        : partial.orderSource === 'manual'
          ? 'manual'
          : partial.orderSource === 'table'
            ? 'table'
            : undefined,
  };
  const prev = loadDailyLedger();
  persistDailyLedgerEntries([...prev.entries, entry]);
  import('./dailyLedgerSync.js').then(({ pushDailyLedgerEntryToSupabase }) => {
    pushDailyLedgerEntryToSupabase(entry);
  });
  return entry;
}

/** 会計済み伝票（日計1件）を削除。厨房・オーナー共通の localStorage */
export function removeDailyLedgerEntry(entryId) {
  const id = String(entryId || '').trim();
  if (!id) return false;
  const prev = loadDailyLedger();
  const next = prev.entries.filter((e) => e.id !== id);
  if (next.length === prev.entries.length) return false;
  recordDeletedLedgerId(id);
  persistDailyLedgerEntries(next);
  import('./dailyLedgerSync.js').then(({ purgeDailyLedgerEntryFromSupabase }) => {
    purgeDailyLedgerEntryFromSupabase(id);
  });
  return true;
}

/** 会計済み伝票の日時を修正（dateKey も recordedAt に合わせて更新） */
export function updateDailyLedgerEntryRecordedAt(entryId, recordedAt) {
  const id = String(entryId || '').trim();
  const ts = Number(recordedAt);
  if (!id || !Number.isFinite(ts)) return null;
  const prev = loadDailyLedger();
  let updated = null;
  const next = prev.entries.map((e) => {
    if (e.id !== id) return e;
    updated = { ...e, recordedAt: ts, dateKey: getLocalDateKey(ts) };
    return updated;
  });
  if (!updated) return null;
  persistDailyLedgerEntries(next);
  import('./dailyLedgerSync.js').then(({ pushDailyLedgerEntryToSupabase }) => {
    pushDailyLedgerEntryToSupabase(updated);
  });
  return updated;
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
