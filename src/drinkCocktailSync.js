/** 旧カクテル欄：基酒単品・統合ワイン等（作成一覧へ移行済み） */
export const LEGACY_DRINK_COCKTAIL_ITEM_IDS = new Set([
  'pd-sp-gin',
  'pd-sp-vodka',
  'pd-sp-rum-white',
  'pd-sp-rum-dark',
  'pd-sp-green-tea-liq',
  'pd-sp-elderflower',
  'pd-sp-campari',
  'pd-sp-malibu',
  'pd-sp-kahlua',
  'pd-sp-passoa',
  'pd-sp-brandy-xo-deluxe',
  'pd-sp-brandy-xo',
  'pd-wine-glass',
]);

/** 新カクテル欄（作成一覧）の代表 id */
export const REQUIRED_DRINK_COCKTAIL_ITEM_IDS = ['pd-ck-gin-tonic', 'pd-ck-dark-rum-soda', 'pd-ck-kitty'];

export function drinkCocktailSectionNeedsRefresh(catalog) {
  const cocktail = (catalog || []).find((s) => s.id === 'cocktail');
  if (!cocktail?.items?.length) return true;
  const itemIds = new Set(cocktail.items.map((it) => it.id));
  if ([...LEGACY_DRINK_COCKTAIL_ITEM_IDS].some((id) => itemIds.has(id))) return true;
  return !REQUIRED_DRINK_COCKTAIL_ITEM_IDS.every((id) => itemIds.has(id));
}
