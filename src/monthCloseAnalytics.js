/**
 * 月次締め用：日計から月間集計を生成
 */

import { summarizeLedgerCategoryBuckets } from './ledgerCategoryBuckets.js';

export const BUCKET_KEYS = ['softcream_fruit', 'cafe_drink', 'takeout_sweets'];

export const COGS_COST_KEY = 'cogs';
export const EXPENSE_AMOUNT_KEYS = ['labor', 'rent', 'other'];

const EXPENSE_LABELS = {
  labor: '人件費',
  rent: '家賃・光熱',
  other: 'その他経費',
};

export const BUCKET_LABELS = {
  softcream_fruit: 'ソフトクリーム',
  cafe_drink: 'カフェドリンク',
  takeout_sweets: 'テイクアウトスイーツ',
};

/** @typedef {{
 *   key: string,
 *   label: string,
 *   percent: number,
 * }} CostLineInput
 */

/**
 * @param {import('./dailyLedger.js').LedgerEntry[]} entries
 * @param {string} monthKey YYYY-MM
 */
export function entriesForMonth(entries, monthKey) {
  const prefix = `${monthKey}-`;
  return entries.filter((e) => e && String(e.dateKey || '').startsWith(prefix));
}

/**
 * @param {import('./dailyLedger.js').LedgerEntry[]} monthEntries
 */
export function buildMonthSalesSummary(monthEntries) {
  let grandTotal = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let nhPlanTotal = 0;
  let foodTotal = 0;

  for (const e of monthEntries) {
    grandTotal += e.total;
    if (e.payment === 'card' || e.payment === 'card_5pct') cardTotal += e.total;
    else cashTotal += e.total;
    nhPlanTotal += Math.max(0, Number(e.nomihodaiPlanYen) || 0);
    const alc = Math.max(0, Number(e.alcoholChargeYen) || 0);
    foodTotal += Math.max(0, Number(e.normalSubtotal) || 0) + alc;
  }

  const buckets = summarizeLedgerCategoryBuckets(monthEntries);
  const bucketGrand =
    buckets.softcream_fruit.revenue +
    buckets.cafe_drink.revenue +
    buckets.takeout_sweets.revenue;

  const shareBase = bucketGrand > 0 ? bucketGrand : grandTotal;

  const bucketShares = {};
  for (const key of BUCKET_KEYS) {
    const rev = buckets[key].revenue;
    bucketShares[key] = {
      revenue: rev,
      lineCount: buckets[key].lineCount,
      sharePct: shareBase > 0 ? (rev / shareBase) * 100 : 0,
      sharePctOfGrand: grandTotal > 0 ? (rev / grandTotal) * 100 : 0,
    };
  }

  return {
    checkoutCount: monthEntries.length,
    grandTotal,
    cashTotal,
    cardTotal,
    nhPlanTotal,
    foodTotal,
    nhSharePct: grandTotal > 0 ? (nhPlanTotal / grandTotal) * 100 : 0,
    foodSharePct: grandTotal > 0 ? (foodTotal / grandTotal) * 100 : 0,
    buckets,
    bucketGrand,
    bucketShares,
    unclassifiedInBuckets: Math.max(0, grandTotal - bucketGrand),
  };
}

/** @param {number} grandTotal @param {CostLineInput[]} costLines */
export function costLinesWithAmounts(grandTotal, costLines) {
  const base = Math.max(0, Number(grandTotal) || 0);
  return costLines.map((row) => {
    const pct = Math.min(100, Math.max(0, Number(row.percent) || 0));
    return {
      ...row,
      percent: pct,
      amountYen: Math.round(base * (pct / 100)),
    };
  });
}

/**
 * 月締め用：原価は％、その他経費は経費入力ページの金額
 * @param {number} grandTotal
 * @param {number} cogsPercent
 * @param {{ labor?: number, rent?: number, other?: number }} expenseAmounts
 */
export function buildMonthCostLines(grandTotal, cogsPercent, expenseAmounts = {}) {
  const base = Math.max(0, Number(grandTotal) || 0);
  const cogsPct = Math.min(100, Math.max(0, Number(cogsPercent) || 0));
  const lines = [
    {
      key: COGS_COST_KEY,
      label: '原価',
      percent: cogsPct,
      amountYen: Math.round(base * (cogsPct / 100)),
      inputMode: 'percent',
    },
  ];
  for (const key of EXPENSE_AMOUNT_KEYS) {
    const amountYen = Math.max(0, Math.round(Number(expenseAmounts[key]) || 0));
    lines.push({
      key,
      label: EXPENSE_LABELS[key],
      percent: base > 0 ? (amountYen / base) * 100 : 0,
      amountYen,
      inputMode: 'amount',
    });
  }
  return lines;
}

export function defaultCostLines(cogsPercent = 35) {
  return buildMonthCostLines(0, cogsPercent, {});
}

export function costLinesTotalPercent(lines) {
  return lines.reduce((s, r) => s + (Number(r.percent) || 0), 0);
}

export function expenseAmountsTotal(expenseAmounts = {}) {
  return EXPENSE_AMOUNT_KEYS.reduce(
    (sum, key) => sum + Math.max(0, Math.round(Number(expenseAmounts[key]) || 0)),
    0,
  );
}
