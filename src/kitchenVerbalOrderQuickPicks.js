/** 口頭注文シート：よく使う品目（メニューマスタと併用） */
export const KITCHEN_VERBAL_FOOD_PICKS = [
  { itemId: 'staff-abu-normal-m', itemName: '米風亭 油そば（並）', price: 1130, kind: 'food' },
  { itemId: 'staff-abu-spicy-m', itemName: '辛々担々 油そば（並）', price: 1180, kind: 'food' },
  { itemId: 'staff-abu-cheese-m', itemName: 'チーズ 油そば（並）', price: 1180, kind: 'food' },
  { itemId: 'sd-edamame', itemName: '塩ゆで枝豆', price: 450, kind: 'food' },
  { itemId: 'sd-karaage', itemName: 'Yum特性から揚げ', price: 790, kind: 'food' },
];

export function flattenDrinkQuickPicks(drinkSections, limit = 14) {
  const out = [];
  for (const sec of drinkSections || []) {
    for (const it of sec.items || []) {
      if (it.price == null || !Number.isFinite(it.price)) continue;
      out.push({
        itemId: it.id,
        itemName: it.name,
        price: it.price,
        kind: 'drink',
        sectionJa: sec.titleJa,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
