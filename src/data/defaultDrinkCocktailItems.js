/**
 * 客席ドリンク「カクテル」欄（カクテル作成一覧・商品名のみ）
 * 飲み放題カクテルとは別ラインナップ
 */
export const DEFAULT_DRINK_COCKTAIL_ITEMS = [
  // ジンベース
  { id: 'pd-ck-gin-soda', name: 'ジンソーダ', nameEn: 'Gin soda', price: 700 },
  { id: 'pd-ck-gin-tonic', name: 'ジントニック', nameEn: 'Gin and tonic', price: 700 },
  { id: 'pd-ck-gin-rickey', name: 'ジンリッキー', nameEn: 'Gin rickey', price: 700 },
  { id: 'pd-ck-gin-buck', name: 'ジンバック', nameEn: 'Gin buck', price: 700 },
  { id: 'pd-ck-gin-coke', name: 'ジンコーク', nameEn: 'Gin and Coke', price: 700 },
  // ウォッカベース
  { id: 'pd-ck-vodka-soda', name: 'ウォッカソーダ', nameEn: 'Vodka soda', price: 700 },
  { id: 'pd-ck-moscow', name: 'モスコミュール', nameEn: 'Moscow mule', price: 700 },
  { id: 'pd-ck-vodka-tonic', name: 'ウォッカトニック', nameEn: 'Vodka tonic', price: 700 },
  { id: 'pd-ck-vodka-coke', name: 'ウォッカコーク', nameEn: 'Vodka and Coke', price: 700 },
  { id: 'pd-ck-screwdriver', name: 'スクリュードライバー', nameEn: 'Screwdriver', price: 700 },
  // ラムベース（バカルディ）
  { id: 'pd-ck-rum-soda', name: 'ラムソーダ', nameEn: 'Rum soda', price: 700 },
  { id: 'pd-ck-rum-coke', name: 'ラムコーク', nameEn: 'Rum and Coke', price: 700 },
  { id: 'pd-ck-rum-ginger', name: 'ラムジンジャー', nameEn: 'Rum ginger', price: 700 },
  { id: 'pd-ck-rum-buck', name: 'ラムバック', nameEn: 'Rum buck', price: 700 },
  // ダークラムベース（マイヤーズ）
  { id: 'pd-ck-dark-rum-soda', name: 'ダークラムソーダ', nameEn: 'Dark rum soda', price: 700 },
  { id: 'pd-ck-dark-rum-coke', name: 'ダークラムコーク', nameEn: 'Dark rum and Coke', price: 700 },
  { id: 'pd-ck-dark-rum-ginger', name: 'ダークラムジンジャー', nameEn: 'Dark rum ginger', price: 700 },
  // カンパリベース
  { id: 'pd-ck-campari-soda', name: 'カンパリソーダ', nameEn: 'Campari soda', price: 700 },
  { id: 'pd-ck-campari-orange', name: 'カンパリオレンジ', nameEn: 'Campari orange', price: 700 },
  { id: 'pd-ck-campari-gf', name: 'カンパリグレープフルーツ', nameEn: 'Campari grapefruit', price: 700 },
  // マリブベース
  { id: 'pd-ck-malibu-coke', name: 'マリブコーク', nameEn: 'Malibu and Coke', price: 700 },
  { id: 'pd-ck-malibu-orange', name: 'マリブオレンジ', nameEn: 'Malibu orange', price: 700 },
  // カルーアベース
  { id: 'pd-ck-kahlua-coke', name: 'カルーアコーク', nameEn: 'Kahlúa and Coke', price: 700 },
  // パッソアベース
  { id: 'pd-ck-passoa-orange', name: 'パッソアオレンジ', nameEn: 'Passoã orange', price: 700 },
  { id: 'pd-ck-passoa-soda', name: 'パッソアソーダ', nameEn: 'Passoã soda', price: 700 },
  { id: 'pd-ck-passoa-gf', name: 'パッソアグレープフルーツ', nameEn: 'Passoã grapefruit', price: 700 },
  // カシスベース
  { id: 'pd-ck-cassis-soda', name: 'カシスソーダ', nameEn: 'Cassis soda', price: 700 },
  { id: 'pd-ck-cassis-orange', name: 'カシスオレンジ', nameEn: 'Cassis orange', price: 700 },
  { id: 'pd-ck-cassis-oolong', name: 'カシスウーロン', nameEn: 'Cassis oolong', price: 700 },
  // ピーチリキュールベース
  { id: 'pd-ck-fuzzy', name: 'ファジーネーブル', nameEn: 'Fuzzy navel', price: 700 },
  { id: 'pd-ck-peach-oolong', name: 'ピーチウーロン', nameEn: 'Peach oolong', price: 700 },
  { id: 'pd-ck-peach-soda', name: 'ピーチソーダ', nameEn: 'Peach soda', price: 700 },
  // ビールカクテル
  { id: 'pd-ck-shandy', name: 'シャンディガフ', nameEn: 'Shandy gaff', price: 700 },
  { id: 'pd-ck-redeye', name: 'レッドアイ', nameEn: 'Red eye', price: 700 },
  { id: 'pd-ck-coke-beer', name: 'コークビア', nameEn: 'Coke beer', price: 700 },
  // ワインカクテル・ワイン
  { id: 'pd-ck-kitty', name: 'キティ', nameEn: 'Kitty', price: 700 },
  { id: 'pd-ck-kalimotxo', name: 'カリモーチョ', nameEn: 'Kalimotxo', price: 700 },
  { id: 'pd-ck-operator', name: 'オペレーター', nameEn: 'Operator', price: 700 },
  { id: 'pd-ck-spritzer', name: 'スプリッツァー', nameEn: 'Spritzer', price: 700 },
  { id: 'pd-ck-wine-red', name: 'グラスワイン（赤）', nameEn: 'Glass wine (red)', price: 700 },
  { id: 'pd-ck-wine-white', name: 'グラスワイン（白）', nameEn: 'Glass wine (white)', price: 700 },
];

/** 客席ドリンクカクテル → 飲み放題カクテル欄（品名のみ・別料金なし） */
export function drinkCocktailItemsToNomihodaiCatalog(items = DEFAULT_DRINK_COCKTAIL_ITEMS) {
  return items.map(({ id, name, nameEn }) => ({
    id: id.replace(/^pd-ck-/, 'nh-ck-'),
    name,
    nameEn: nameEn || '',
  }));
}
