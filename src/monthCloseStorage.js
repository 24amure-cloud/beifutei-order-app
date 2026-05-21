/** 月締め確定データ（localStorage） */

export const MONTH_CLOSE_STORAGE_KEY = 'beifutei-month-close-v1';

/**
 * @typedef {{
 *   monthKey: string,
 *   confirmedAt: number,
 *   checkoutCount: number,
 *   grandTotal: number,
 *   cashTotal: number,
 *   cardTotal: number,
 *   nhPlanTotal: number,
 *   foodTotal: number,
 *   nhSharePct: number,
 *   foodSharePct: number,
 *   bucketGrand: number,
 *   bucketShares: Record<string, { revenue: number, lineCount: number, sharePct: number, sharePctOfGrand: number }>,
 *   unclassifiedInBuckets: number,
 *   costLines: Array<{ key: string, label: string, percent: number, amountYen: number }>,
 *   memo: string,
 * }} MonthCloseRecord
 */

function readAll() {
  try {
    const raw = localStorage.getItem(MONTH_CLOSE_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p.records) ? p.records : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  localStorage.setItem(MONTH_CLOSE_STORAGE_KEY, JSON.stringify({ version: 1, records }));
  try {
    window.dispatchEvent(new CustomEvent('beifutei-month-close-updated'));
  } catch {
    /* ignore */
  }
}

export function listMonthCloses() {
  return readAll().sort((a, b) => String(b.monthKey).localeCompare(String(a.monthKey)));
}

/** @param {string} monthKey */
export function getMonthClose(monthKey) {
  return readAll().find((r) => r.monthKey === monthKey) || null;
}

/** @param {MonthCloseRecord} record */
export function saveMonthClose(record) {
  const list = readAll().filter((r) => r.monthKey !== record.monthKey);
  list.push(record);
  writeAll(list);
  return record;
}

/** @param {string} monthKey */
export function deleteMonthClose(monthKey) {
  writeAll(readAll().filter((r) => r.monthKey !== monthKey));
}
