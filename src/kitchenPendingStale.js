/** 出し忘れ警告：種類別しきい値（ドリンクは早め・フードはやや長め） */
export const STALE_KIND_CONFIG = {
  drink: {
    /** 表示バケット（warn / high / critical の境界） */
    thresholds: [5, 10, 15],
    /** 件数バッジに含める「遅延」の下限（分） */
    staleAfterMin: 5,
  },
  food: {
    thresholds: [8, 13, 18],
    staleAfterMin: 8,
  },
};

/**
 * 未提供ライブ帯の「フード」判定。それ以外はドリンク扱い。
 * @param {object} o
 */
export function pendingKitchenOrderIsFood(o) {
  if (o.isNomihodai) return false;
  const id = String(o.itemId || '');
  if (/^sd-drink-/i.test(id)) return false;
  if (/^abu:/i.test(id)) return true;
  if (/^pz-/i.test(id)) return true;
  if (/^top-/i.test(id)) return true;
  if (/^ts-/i.test(id)) return true;
  if (/^sd-/i.test(id)) return true;
  if (/^fr-/i.test(id)) return true;
  const line = String(o.itemName || '').split('\n')[0];
  if (/油そば|米風亭|辛々|担々|ネギ盛り/.test(line)) return true;
  if (/ピッツァ|ピザ|マルゲリタ|ジェノヴェーゼ|ビスマルク|クワトロフォルマッジ/i.test(line)) return true;
  return false;
}

/**
 * @typedef {'ok'|'warn'|'high'|'critical'} StaleAlertLevel
 */

/**
 * @param {object[]} pendingOrders
 * @param {'drink'|'food'} kind
 * @param {number} nowMs
 */
export function summarizePendingStale(pendingOrders, kind, nowMs) {
  const cfg = STALE_KIND_CONFIG[kind];
  const [warnMin, highMin, criticalMin] = cfg.thresholds;
  const wantFood = kind === 'food';
  let total = 0;
  let worstMin = 0;
  let staleCount = 0;

  for (const o of pendingOrders || []) {
    const isFood = pendingKitchenOrderIsFood(o);
    if (isFood !== wantFood) continue;
    total += 1;
    const ageMin = Math.max(0, Math.floor((nowMs - (Number(o.createdAt) || 0)) / 60000));
    if (ageMin > worstMin) worstMin = ageMin;
    if (ageMin >= cfg.staleAfterMin) staleCount += 1;
  }

  /** @type {StaleAlertLevel} */
  let level = 'ok';
  if (worstMin >= criticalMin) level = 'critical';
  else if (worstMin >= highMin) level = 'high';
  else if (worstMin >= warnMin) level = 'warn';

  let bucketLabel = '';
  if (level !== 'ok') {
    const bucket = cfg.thresholds.filter((m) => worstMin >= m).pop() ?? warnMin;
    bucketLabel = `${bucket}分+`;
  }

  return {
    total,
    worstMin,
    staleCount,
    level,
    bucketLabel,
    staleAfterMin: cfg.staleAfterMin,
  };
}
