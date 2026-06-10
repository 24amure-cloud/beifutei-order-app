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
  { kind: 'side', sideId: 'sd-wiener', left: 54, top: 71, width: 38, height: 22 },
];
