/**
 * 焼酎メニュー画像ページ（public 直下に配置）
 * 推奨ファイル名: shochu-menu.png（タブレット縦向き・幅 1200px 前後）
 */
export const SHOCHU_MENU_IMAGE_FILES = ['shochu-menu.png', 'shochu-menu.jpg', '焼酎メニュー.png'];

/**
 * 画像上のタップ領域（%指定・画像レイアウトに合わせて調整）
 * drinkId → defaultDrinkMenu の焼酎 id
 * sideId → defaultSideDishMenu のサイド id
 */
export const SHOCHU_MENU_HOTSPOTS = [
  { kind: 'drink', drinkId: 'pd-shochu-rento', left: 3.5, top: 36, width: 12.5, height: 21 },
  { kind: 'drink', drinkId: 'pd-shochu-yurubi', left: 17, top: 36, width: 12.5, height: 21 },
  { kind: 'drink', drinkId: 'pd-shochu-kitazato', left: 30.5, top: 36, width: 12.5, height: 21 },
  { kind: 'drink', drinkId: 'pd-shochu-daiyame', left: 44, top: 36, width: 12.5, height: 21 },
  { kind: 'drink', drinkId: 'pd-shochu-nikaido', left: 57.5, top: 36, width: 12.5, height: 21 },
  { kind: 'drink', drinkId: 'pd-shochu-kuro', left: 71, top: 36, width: 12.5, height: 21 },
  { kind: 'drink', drinkId: 'pd-shochu-aka', left: 84.5, top: 36, width: 12.5, height: 21 },
  { kind: 'side', sideId: 'sd-jerky', left: 4, top: 71, width: 38, height: 22 },
  { kind: 'side', sideId: 'sd-pickles', left: 54, top: 71, width: 38, height: 22 },
];

/** おすすめ①ページ：品名チップ用の説明文（厨房・注文名とは別） */
export const SHOCHU_MENU_ITEM_COPY = {
  'pd-shochu-rento': {
    ja: 'すっきりとした飲みやすさの焼酎',
    en: 'Light and easy to drink.',
  },
  'pd-shochu-yurubi': {
    ja: '華やかな香りとやわらかな口当たり',
    en: 'Floral aroma with a soft finish.',
  },
  'pd-shochu-kitazato': {
    ja: '芋の優しい甘みが楽しめる焼酎',
    en: 'Gentle sweet-potato sweetness.',
  },
  'pd-shochu-daiyame': {
    ja: 'ライチのような華やかな香りの芋焼酎',
    en: 'Lychee-like aroma; a modern imo shochu.',
  },
  'pd-shochu-nikaido': {
    ja: '香ばしい麦の香り、料理に合う一杯',
    en: 'Toasty barley notes; pairs with food.',
  },
  'pd-shochu-kuro': {
    ja: '濃厚な甘みと清々しいキレ',
    en: 'Rich sweetness with a clean finish.',
  },
  'pd-shochu-aka': {
    ja: '華やかな香りの大人気霧島',
    en: 'Popular Kirishima with a vivid aroma.',
  },
  'sd-jerky': {
    ja: '燻製の香り、噛むほど旨味が広がる',
    en: 'Smoky aroma; more umami as you chew.',
  },
  'sd-pickles': {
    ja: '爽やかな味わいで口の中をリセット',
    en: 'Refreshing; cleanses the palate.',
  },
};

export function shochuMenuItemDescription(itemId, locale) {
  const row = SHOCHU_MENU_ITEM_COPY[itemId];
  if (!row) return '';
  return locale === 'en' ? row.en : row.ja;
}
