import { DEFAULT_DRINK_MENU_SECTIONS } from './data/defaultDrinkMenu.js';

/** 飲み放題カクテル id → 客席ドリンク「カクテル」id */
export const NH_TO_DRINK_COCKTAIL_ID = {
  'nh-ck-gin': 'pd-sp-gin',
  'nh-ck-vodka': 'pd-sp-vodka',
  'nh-ck-rum-white': 'pd-sp-rum-white',
  'nh-ck-elderflower': 'pd-sp-elderflower',
  'nh-ck-campari': 'pd-sp-campari',
  'nh-ck-malibu': 'pd-sp-malibu',
  'nh-ck-kahlua': 'pd-sp-kahlua',
  'nh-ck-passoa': 'pd-sp-passoa',
  'nh-ck-brandy-xo-deluxe': 'pd-sp-brandy-xo-deluxe',
  'nh-ck-brandy-xo': 'pd-sp-brandy-xo',
  'nh-ck-green-tea-liq': 'pd-sp-green-tea-liq',
  'nh-ck-wine-glass': 'pd-wine-glass',
  'nh-ck-cassis-soda': 'pd-ck-cassis-soda',
  'nh-ck-cassis-orange': 'pd-ck-cassis-orange',
  'nh-ck-cassis-oolong': 'pd-ck-cassis-oolong',
  'nh-ck-fuzzy': 'pd-ck-fuzzy',
  'nh-ck-peach-oolong': 'pd-ck-peach-oolong',
};

const DEFAULT_COCKTAIL_SECTION = DEFAULT_DRINK_MENU_SECTIONS.find((s) => s.id === 'cocktail');
const DEFAULT_COCKTAIL_PRICES = Object.fromEntries(
  (DEFAULT_COCKTAIL_SECTION?.items || []).map((it) => [it.id, it.price])
);

/** 旧カクテル欄（ジントニック等）・廃止品が残っていないか */
export const LEGACY_DRINK_COCKTAIL_ITEM_IDS = new Set([
  'pd-ck-gin-tonic',
  'pd-ck-gin-buck',
  'pd-ck-moscow',
  'pd-ck-screwdriver',
  'pd-ck-rum-coke',
  'pd-sp-rum-dark',
]);

/** 新カクテル欄に含まれるべき代表 id */
export const REQUIRED_DRINK_COCKTAIL_ITEM_IDS = ['pd-sp-gin', 'pd-sp-elderflower', 'pd-ck-cassis-soda'];

export function drinkCocktailSectionNeedsRefresh(catalog) {
  const cocktail = (catalog || []).find((s) => s.id === 'cocktail');
  if (!cocktail?.items?.length) return true;
  const itemIds = new Set(cocktail.items.map((it) => it.id));
  if ([...LEGACY_DRINK_COCKTAIL_ITEM_IDS].some((id) => itemIds.has(id))) return true;
  return !REQUIRED_DRINK_COCKTAIL_ITEM_IDS.every((id) => itemIds.has(id));
}

export function buildDrinkCocktailItemsFromNomihodai(nhCocktailItems, existingDrinkCocktailItems = []) {
  const priceById = Object.fromEntries((existingDrinkCocktailItems || []).map((it) => [it.id, it.price]));

  return (nhCocktailItems || [])
    .map((nhIt) => {
      const drinkId = NH_TO_DRINK_COCKTAIL_ID[nhIt.id];
      if (!drinkId) return null;
      const defaultPrice = DEFAULT_COCKTAIL_PRICES[drinkId] ?? 700;
      const price =
        nhIt.price != null && Number.isFinite(Number(nhIt.price))
          ? Number(nhIt.price)
          : (priceById[drinkId] ?? defaultPrice);
      return {
        id: drinkId,
        name: nhIt.name,
        nameEn: nhIt.nameEn || '',
        price,
      };
    })
    .filter(Boolean);
}

/** 飲み放題カクテル欄の品目順・名称を客席ドリンク「カクテル」へ反映 */
export function mergeDrinkCocktailFromNomihodai(drinkSections, nomihodaiCatalog) {
  const nhCocktail = (nomihodaiCatalog || []).find((s) => s.id === 'nh-cat-cocktail');
  if (!nhCocktail?.items?.length) return drinkSections;

  const cocktailSec = (drinkSections || []).find((s) => s.id === 'cocktail');
  const newItems = buildDrinkCocktailItemsFromNomihodai(nhCocktail.items, cocktailSec?.items);
  if (newItems.length === 0) return drinkSections;

  return (drinkSections || []).map((sec) => (sec.id === 'cocktail' ? { ...sec, items: newItems } : sec));
}
