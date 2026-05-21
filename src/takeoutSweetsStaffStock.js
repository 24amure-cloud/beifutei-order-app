import { loadSweetsSoldCounts } from './takeoutSweetsInventory.js';

/**
 * 表示在庫（販売累計差引後）を変えたときのマスタ在庫数。
 * base = 表示残 + 本日販売累計
 */
export function baseStockFromDisplayRemainder(itemId, displayRemain, soldCounts = loadSweetsSoldCounts()) {
  const id = String(itemId);
  const sold = Math.max(0, Math.floor(Number(soldCounts[id]) || 0));
  return Math.max(0, Math.floor(Number(displayRemain) || 0) + sold);
}

/** @param {Record<string, number>} inventoryMap */
export function patchInventoryForDisplayRemainder(inventoryMap, itemId, displayRemain, soldCounts) {
  const id = String(itemId);
  if (!id.startsWith('ts-')) return inventoryMap;
  return {
    ...inventoryMap,
    [id]: baseStockFromDisplayRemainder(id, displayRemain, soldCounts),
  };
}

/** @param {Record<string, number>} inventoryMap */
export function patchInventoryDisplayDelta(inventoryMap, itemId, delta, soldCounts) {
  const id = String(itemId);
  const curDisplay =
    typeof inventoryMap[id] === 'number'
      ? Math.max(0, Math.floor(inventoryMap[id]) - Math.max(0, Math.floor(Number(soldCounts?.[id]) || 0)))
      : 0;
  return patchInventoryForDisplayRemainder(inventoryMap, id, curDisplay + delta, soldCounts);
}
