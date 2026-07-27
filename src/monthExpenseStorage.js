/** 月別経費（金額入力・localStorage） */

export const MONTH_EXPENSE_STORAGE_KEY = 'beifutei-month-expenses-v1';

export const EXPENSE_LINE_DEFS = [
  { key: 'labor', label: '人件費' },
  { key: 'rent', label: '家賃・光熱' },
  { key: 'other', label: 'その他経費' },
];

/** 月締め費用の％入力（スイーツなど） */
export const COST_PERCENT_DEFS = [{ key: 'sweets', label: 'スイーツ' }];

/** @typedef {{
 *   monthKey: string,
 *   amounts: { labor: number, rent: number, other: number },
 *   percents?: { sweets: number },
 *   memo: string,
 *   updatedAt: number,
 * }} MonthExpenseRecord */

function readAll() {
  try {
    const raw = localStorage.getItem(MONTH_EXPENSE_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p.records) ? p.records : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  localStorage.setItem(MONTH_EXPENSE_STORAGE_KEY, JSON.stringify({ version: 1, records }));
  try {
    window.dispatchEvent(new CustomEvent('beifutei-month-expenses-updated'));
  } catch {
    /* ignore */
  }
}

function clampPct(n) {
  return Math.min(100, Math.max(0, Number(n) || 0));
}

function normalizeAmounts(amounts) {
  const out = {};
  for (const { key } of EXPENSE_LINE_DEFS) {
    out[key] = Math.max(0, Math.round(Number(amounts?.[key]) || 0));
  }
  return out;
}

function normalizePercents(percents) {
  const out = {};
  for (const { key } of COST_PERCENT_DEFS) {
    out[key] = clampPct(percents?.[key]);
  }
  return out;
}

/** @param {string} monthKey */
export function getMonthExpense(monthKey) {
  return readAll().find((r) => r.monthKey === monthKey) || null;
}

/** @param {string} monthKey */
export function getMonthExpenseAmounts(monthKey) {
  const rec = getMonthExpense(monthKey);
  return normalizeAmounts(rec?.amounts || {});
}

/** @param {string} monthKey */
export function getMonthCostPercents(monthKey) {
  const rec = getMonthExpense(monthKey);
  return normalizePercents(rec?.percents || {});
}

/**
 * @param {string} monthKey
 * @param {{ amounts?: Record<string, number|string>, percents?: Record<string, number|string>, memo?: string }} draft
 */
export function saveMonthExpense(monthKey, draft) {
  const key = String(monthKey || '').trim();
  if (!key) return null;
  const prev = getMonthExpense(key);
  const record = {
    monthKey: key,
    amounts: normalizeAmounts(draft.amounts != null ? draft.amounts : prev?.amounts || {}),
    percents: normalizePercents(
      draft.percents != null ? draft.percents : prev?.percents || {},
    ),
    memo: String(draft.memo != null ? draft.memo : prev?.memo || '').trim().slice(0, 500),
    updatedAt: Date.now(),
  };
  const list = readAll().filter((r) => r.monthKey !== key);
  list.push(record);
  writeAll(list);
  return record;
}

/**
 * @param {string} monthKey
 * @param {Record<string, number|string>} percents
 */
export function saveMonthCostPercents(monthKey, percents) {
  const prev = getMonthExpense(monthKey);
  return saveMonthExpense(monthKey, {
    amounts: prev?.amounts || {},
    percents,
    memo: prev?.memo || '',
  });
}
