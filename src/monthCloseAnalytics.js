/**
 * 月次締め用：日計から月間集計を生成
 */

import { summarizeLedgerCategoryBuckets } from './ledgerCategoryBuckets.js';

export const BUCKET_KEYS = ['softcream_fruit', 'cafe_drink', 'takeout_sweets'];

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

export function defaultCostLines(cogsPercent = 35) {
  return [
    { key: 'cogs', label: '原価', percent: cogsPercent },
    { key: 'labor', label: '人件費', percent: 0 },
    { key: 'rent', label: '家賃・光熱', percent: 0 },
    { key: 'other', label: 'その他経費', percent: 0 },
  ];
}

export function costLinesTotalPercent(lines) {
  return lines.reduce((s, r) => s + (Number(r.percent) || 0), 0);
}
