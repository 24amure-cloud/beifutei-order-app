/**
 * 月次締め用：日計から月間集計を生成
 */

import { MENU_BUCKET_KEYS, MENU_BUCKET_LABELS, summarizeLedgerMenuBuckets } from './ledgerCategoryBuckets.js';

export const BUCKET_KEYS = MENU_BUCKET_KEYS;
export const BUCKET_LABELS = MENU_BUCKET_LABELS;

export const COGS_COST_KEY = 'cogs';
export const SWEETS_COST_KEY = 'sweets';
/** スイーツ費用の対象売上（ソフト＋カフェ＋テイクアウトスイーツ） */
export const SWEETS_BUCKET_KEYS = ['softcream_fruit', 'cafe_drink', 'takeout_sweets'];
export const EXPENSE_AMOUNT_KEYS = ['labor', 'rent', 'other'];

const EXPENSE_LABELS = {
  labor: '人件費',
  rent: '家賃・光熱',
  other: 'その他経費',
};

/**
 * @param {Record<string, { revenue?: number }>|null|undefined} bucketShares
 */
export function sumSweetsRevenue(bucketShares) {
  if (!bucketShares) return 0;
  let sum = 0;
  for (const key of SWEETS_BUCKET_KEYS) {
    sum += Math.max(0, Number(bucketShares[key]?.revenue) || 0);
  }
  return sum;
}

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
 * 月内・指定カテゴリの明細行（日付・品名・値段）
 * @param {import('./dailyLedger.js').LedgerEntry[]} monthEntries
 * @param {string} bucketKey
 */
export function listMonthBucketDetailLines(monthEntries, bucketKey) {
  const { buckets } = summarizeLedgerMenuBuckets(monthEntries);
  const bucket = buckets[bucketKey];
  if (!bucket) return [];
  return Array.isArray(bucket.lines) ? bucket.lines : [];
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

  const { buckets, bucketGrand } = summarizeLedgerMenuBuckets(monthEntries);
  const shareBase = grandTotal > 0 ? grandTotal : 1;

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
 * 月締め用：原価は％、スイーツは対象売上への％、その他経費は経費入力の金額
 * @param {number} grandTotal
 * @param {number} cogsPercent
 * @param {{ labor?: number, rent?: number, other?: number }} expenseAmounts
 * @param {{ sweetsPercent?: number, sweetsBaseYen?: number }} [opts]
 */
export function buildMonthCostLines(grandTotal, cogsPercent, expenseAmounts = {}, opts = {}) {
  const base = Math.max(0, Number(grandTotal) || 0);
  const cogsPct = Math.min(100, Math.max(0, Number(cogsPercent) || 0));
  const sweetsBase = Math.max(0, Math.round(Number(opts.sweetsBaseYen) || 0));
  const sweetsPct = Math.min(100, Math.max(0, Number(opts.sweetsPercent) || 0));
  const sweetsYen = Math.round(sweetsBase * (sweetsPct / 100));
  const lines = [
    {
      key: COGS_COST_KEY,
      label: '原価',
      percent: cogsPct,
      amountYen: Math.round(base * (cogsPct / 100)),
      inputMode: 'percent',
    },
    {
      key: SWEETS_COST_KEY,
      label: 'スイーツ',
      percent: sweetsPct,
      amountYen: sweetsYen,
      baseYen: sweetsBase,
      /** 総売上に対する比率（売上比合計用） */
      shareOfGrandPct: base > 0 ? (sweetsYen / base) * 100 : 0,
      inputMode: 'percent_on_sweets',
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

/** 売上比合計（各行の金額 ÷ 総売上）。grandTotal 未指定時は percent 合算 */
export function costLinesTotalPercent(lines, grandTotal) {
  const base = Math.max(0, Number(grandTotal) || 0);
  if (base > 0) {
    const totalYen = lines.reduce((s, r) => s + Math.max(0, Number(r.amountYen) || 0), 0);
    return (totalYen / base) * 100;
  }
  return lines.reduce((s, r) => {
    if (r.inputMode === 'percent_on_sweets') return s + (Number(r.shareOfGrandPct) || 0);
    return s + (Number(r.percent) || 0);
  }, 0);
}

export function expenseAmountsTotal(expenseAmounts = {}) {
  return EXPENSE_AMOUNT_KEYS.reduce(
    (sum, key) => sum + Math.max(0, Math.round(Number(expenseAmounts[key]) || 0)),
    0,
  );
}
