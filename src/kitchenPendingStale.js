/** 出し忘れ警告：5分刻み（5 / 10 / 15分〜） */
export const STALE_ALERT_THRESHOLDS_MIN = [5, 10, 15];

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
    if (ageMin >= STALE_ALERT_THRESHOLDS_MIN[0]) staleCount += 1;
  }

  /** @type {StaleAlertLevel} */
  let level = 'ok';
  if (worstMin >= 15) level = 'critical';
  else if (worstMin >= 10) level = 'high';
  else if (worstMin >= 5) level = 'warn';

  /** 表示用：次の5分刻みラベル（5分→「5分+」、12分→「10分+」） */
  let bucketLabel = '';
  if (level !== 'ok') {
    const bucket = STALE_ALERT_THRESHOLDS_MIN.filter((m) => worstMin >= m).pop() ?? 5;
    bucketLabel = `${bucket}分+`;
  }

  return { total, worstMin, staleCount, level, bucketLabel };
}
