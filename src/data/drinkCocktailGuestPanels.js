/**
 * 客席ドリンク：カクテル欄を2パネルに分割（作成一覧の並びを維持）
 */
export const DRINK_COCKTAIL_GUEST_PANELS = [
  {
    id: 'cocktail-spirits',
    titleEn: 'COCKTAIL',
    titleJa: 'カクテル①',
    subtitleEn: 'Gin, vodka, rum & liqueurs',
    subtitleJa: 'ジン・ウォッカ・ラム・リキュール',
    heroSectionId: 'cocktail',
    /** この id まで（含む）を左パネルへ */
    lastItemId: 'pd-ck-malibu-milk',
  },
  {
    id: 'cocktail-mix',
    titleEn: 'COCKTAIL',
    titleJa: 'カクテル②',
    subtitleEn: 'Fruit, beer & wine',
    subtitleJa: 'カシス・ピーチ・ビール・ワイン',
    heroSectionId: 'wine',
    /** この id から右パネルへ */
    firstItemId: 'pd-ck-kahlua-milk',
  },
];

export function splitDrinkCocktailItemsForGuest(items) {
  const list = items || [];
  const [a, b] = DRINK_COCKTAIL_GUEST_PANELS;
  const splitAt = list.findIndex((it) => it.id === a.lastItemId);
  const rightStart = list.findIndex((it) => it.id === b.firstItemId);
  if (splitAt < 0 || rightStart < 0 || rightStart <= splitAt) {
    const mid = Math.ceil(list.length / 2);
    return [
      { ...a, items: list.slice(0, mid) },
      { ...b, items: list.slice(mid) },
    ];
  }
  return [
    { ...a, items: list.slice(0, splitAt + 1) },
    { ...b, items: list.slice(rightStart) },
  ];
}
