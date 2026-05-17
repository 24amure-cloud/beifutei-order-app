/** 厨房・会計UI向けの注文行表示ヘルパー */

export function orderKindMeta(o) {
  const firstLine = String(o.itemName || '')
    .split('\n')[0]
    .trim();
  const emoji = o.isNomihodai ? '🍺' : /油そば|米風亭/.test(firstLine) ? '🍜' : '🍽️';
  return { firstLine, emoji };
}

export function orderLineTaxInLabel(o) {
  const yen = Math.max(0, Number(o.itemPrice) || 0);
  if (yen > 0) return `￥${yen.toLocaleString()}`;
  if (o.isNomihodai) return '飲み放題内';
  return '￥0';
}

export function orderLineSlipMetaPrice(o) {
  const yen = Math.max(0, Number(o.itemPrice) || 0);
  if (yen > 0) return `￥${yen.toLocaleString()}`;
  if (o.isNomihodai) return '飲み放題内';
  return `￥${yen.toLocaleString()}`;
}

export function isNomihodaiChargedExtra(o) {
  return !!o?.isNomihodai && Math.max(0, Number(o.itemPrice) || 0) > 0;
}

export function nhToggleShowsNomihodaiActive(o) {
  return !!o?.isNomihodai && Math.max(0, Number(o.itemPrice) || 0) === 0;
}
