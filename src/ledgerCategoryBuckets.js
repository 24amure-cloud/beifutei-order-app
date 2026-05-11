/**
 * 日計伝票行の itemId から、オーナー向けカテゴリを判定する。
 * （カフェタブ: cafe-* / フルーツ・ソフト: fr-* / テイクアウトスイーツ: ts-*）
 */

/** @typedef {'cafe_drink'|'softcream_fruit'|'takeout_sweets'} LedgerCategoryBucket */

/**
 * @param {unknown} itemId
 * @returns {LedgerCategoryBucket|null}
 */
export function classifyLedgerLineItemId(itemId) {
  const id = String(itemId ?? '').trim();
  if (!id) return null;
  if (id.startsWith('ts-')) return 'takeout_sweets';
  if (id.startsWith('cafe-')) return 'cafe_drink';
  if (id.startsWith('fr-')) return 'softcream_fruit';
  return null;
}

const EMPTY = () => ({ revenue: 0, lineCount: 0, lines: [] });

/**
 * 指定日の会計エントリから、カフェ／ソフト・フルーツ／テイクアウトの売上だけを抜き出す。
 * @param {object[]} dayEntries
 */
export function summarizeLedgerCategoryBuckets(dayEntries) {
  /** @type {Record<LedgerCategoryBucket, { revenue: number, lineCount: number, lines: { name: string, price: number, itemId: string }[] }>} */
  const out = {
    cafe_drink: EMPTY(),
    softcream_fruit: EMPTY(),
    takeout_sweets: EMPTY(),
  };
  for (const e of dayEntries) {
    const lines = Array.isArray(e.lines) ? e.lines : [];
    for (const ln of lines) {
      if (!ln || ln.kind !== 'normal') continue;
      const price = Math.max(0, Number(ln.price) || 0);
      if (price <= 0) continue;
      const cat = classifyLedgerLineItemId(ln.itemId);
      if (!cat) continue;
      const name = typeof ln.name === 'string' ? ln.name.split('\n')[0].trim().slice(0, 80) : '';
      const itemId = String(ln.itemId ?? '');
      out[cat].revenue += price;
      out[cat].lineCount += 1;
      out[cat].lines.push({ name: name || itemId || '（品目）', price, itemId });
    }
  }
  for (const b of Object.values(out)) {
    b.lines.sort((a, b) => b.price - a.price);
  }
  return out;
}
