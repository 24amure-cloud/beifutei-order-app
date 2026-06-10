/** 客席ドリンク「カクテル」に出さない基酒（飲み放題カクテル欄のみ） */
export const DRINK_COCKTAIL_EXCLUDED_SPIRIT_IDS = new Set([
  'pd-sp-gin',
  'pd-sp-vodka',
  'pd-sp-rum-white',
  'pd-sp-green-tea-liq',
]);

/** 旧カクテル欄（ジントニック等）・廃止品が残っていないか */
export const LEGACY_DRINK_COCKTAIL_ITEM_IDS = new Set([
  'pd-ck-gin-tonic',
  'pd-ck-gin-buck',
  'pd-ck-moscow',
  'pd-ck-screwdriver',
  'pd-ck-rum-coke',
  'pd-sp-rum-dark',
  ...DRINK_COCKTAIL_EXCLUDED_SPIRIT_IDS,
]);

/** 客席ドリンク「カクテル」欄に含まれるべき代表 id */
export const REQUIRED_DRINK_COCKTAIL_ITEM_IDS = ['pd-sp-elderflower', 'pd-ck-cassis-soda'];

export function drinkCocktailSectionNeedsRefresh(catalog) {
  const cocktail = (catalog || []).find((s) => s.id === 'cocktail');
  if (!cocktail?.items?.length) return true;
  const itemIds = new Set(cocktail.items.map((it) => it.id));
  if ([...LEGACY_DRINK_COCKTAIL_ITEM_IDS].some((id) => itemIds.has(id))) return true;
  return !REQUIRED_DRINK_COCKTAIL_ITEM_IDS.every((id) => itemIds.has(id));
}
