/**
 * 飲み放題カタログ初期データ（マスターで上書き可能・localStorage に保存）
 * 表示順：ビール → ハイボール → 焼酎・お茶ハイ → サワー → ワイン → カクテル → ノンアル・ソフト（統合）
 * `name` … 厨房・伝票・注文行（日本語）
 * `nameEn` … 客席タブレットが英語 UI のときの表示（未設定時は `name` を表示）
 */
import { drinkCocktailItemsToNomihodaiCatalog } from './defaultDrinkCocktailItems.js';

export const DEFAULT_NOMIHODAI_CATALOG = [
  {
    id: 'nh-cat-beer',
    titleJa: 'ビール',
    titleEn: 'BEER',
    items: [
      { id: 'nh-beer-glass', name: 'グラスビール', nameEn: 'Draft beer (glass)' },
      { id: 'nh-beer-shandy', name: 'シャンディガフ', nameEn: 'Shandy Gaff' },
      { id: 'nh-beer-redeye', name: 'レッドアイ', nameEn: 'Red Eye' },
    ],
  },
  {
    id: 'nh-cat-highball',
    titleJa: 'ハイボール',
    titleEn: 'HIGHBALL',
    items: [
      { id: 'nh-hb-black-nikka', name: 'ハイボール（ブラックニッカ）', nameEn: 'Highball (Black Nikka)' },
      { id: 'nh-hb-kaku', name: '角ハイボール', nameEn: 'Kakubin Highball' },
      { id: 'nh-hb-jim', name: 'ジムビームハイボール', nameEn: 'Jim Beam Highball' },
    ],
  },
  {
    id: 'nh-cat-shochu',
    titleJa: '焼酎・お茶ハイ',
    titleEn: 'SHOCHU / OCHAHAI',
    items: [
      { id: 'nh-shochu-mugi', name: '麦焼酎', nameEn: 'Barley shochu' },
      { id: 'nh-shochu-imo', name: '芋焼酎', nameEn: 'Imo shochu' },
      { id: 'nh-shochu-shiso', name: 'しそ焼酎（鍛高譚）', nameEn: 'Shiso shochu (Takahashi)' },
      { id: 'nh-chu-oolong', name: 'ウーロンハイ', nameEn: 'Oolong chuhai' },
      { id: 'nh-chu-green', name: '緑茶ハイ', nameEn: 'Green tea chuhai' },
      { id: 'nh-chu-jasmine', name: 'ジャスミンハイ', nameEn: 'Jasmine chuhai' },
      { id: 'nh-chu-mugicha', name: '麦茶ハイ', nameEn: 'Barley tea chuhai' },
      { id: 'nh-chu-plain', name: '無糖ハイ', nameEn: 'Plain soda chuhai' },
    ],
  },
  {
    id: 'nh-cat-sour',
    titleJa: 'サワー',
    titleEn: 'SOUR',
    items: [
      { id: 'nh-sour-lemon', name: 'レモンサワー', nameEn: 'Lemon sour' },
      { id: 'nh-sour-yuzu', name: 'ゆずサワー', nameEn: 'Yuzu sour' },
      { id: 'nh-sour-ume', name: '梅サワー', nameEn: 'Plum sour' },
      { id: 'nh-sour-grapefruit', name: 'グレープフルーツサワー', nameEn: 'Grapefruit sour' },
      { id: 'nh-sour-lime', name: 'ライムサワー', nameEn: 'Lime sour' },
      { id: 'nh-sour-kyoho', name: '巨峰サワー', nameEn: 'Kyoho grape sour' },
      { id: 'nh-sour-peach', name: '桃サワー', nameEn: 'Peach sour' },
      { id: 'nh-sour-grape', name: 'ブドウサワー', nameEn: 'Grape sour' },
      { id: 'nh-sour-apple', name: 'リンゴサワー', nameEn: 'Apple sour' },
      { id: 'nh-sour-mango', name: 'マンゴーサワー', nameEn: 'Mango sour' },
    ],
  },
  {
    id: 'nh-cat-cocktail',
    titleJa: 'カクテル',
    titleEn: 'COCKTAIL',
    /** 客席ドリンク「カクテル」作成一覧と同一品名（飲み放題内・別料金なし） */
    items: drinkCocktailItemsToNomihodaiCatalog(),
  },
  {
    id: 'nh-cat-wine',
    titleJa: 'ワイン・ベルモット',
    titleEn: 'WINE / VERMOUTH',
    items: [
      { id: 'nh-wine-glass-red', name: 'グラスワイン（赤）', nameEn: 'Glass wine (red)' },
      { id: 'nh-wine-glass-white', name: 'グラスワイン（白）', nameEn: 'Glass wine (white)' },
      { id: 'nh-wine-kitty', name: 'キティ', nameEn: 'Kitty' },
      { id: 'nh-wine-operator', name: 'オペレーター', nameEn: 'Operator' },
      { id: 'nh-wine-kalimotxo', name: 'カリモーチョ', nameEn: 'Kalimotxo' },
      { id: 'nh-wine-cinzano-rosso', name: 'チンザノ ロッソ（甘口）', nameEn: 'Cinzano Rosso (sweet)' },
      { id: 'nh-wine-cinzano-dry', name: 'チンザノ ドライ（辛口）', nameEn: 'Cinzano Dry' },
    ],
  },
  {
    id: 'nh-cat-nonalcoholic',
    titleJa: 'ノンアル',
    titleEn: 'NON-ALCOHOLIC',
    items: [
      { id: 'nh-ns-nabiru', name: 'ノンアルビール', nameEn: 'Non-alcoholic beer' },
      { id: 'nh-ns-apple', name: 'りんご', nameEn: 'Apple' },
      { id: 'nh-ns-orange', name: 'オレンジ', nameEn: 'Orange' },
      { id: 'nh-ns-grapefruit', name: 'グレープフルーツ', nameEn: 'Grapefruit' },
      { id: 'nh-ns-peach', name: '桃ソーダ', nameEn: 'Peach soda' },
      { id: 'nh-ns-pine', name: 'パインソーダ', nameEn: 'Pineapple soda' },
      { id: 'nh-ns-calpis-water', name: 'カルピスウォーター', nameEn: 'Calpis water' },
      { id: 'nh-ns-calpis-soda', name: 'カルピスソーダ', nameEn: 'Calpis soda' },
      { id: 'nh-ns-yuzu', name: 'ゆずソーダ', nameEn: 'Yuzu soda' },
      { id: 'nh-ns-cola', name: 'コーラ', nameEn: 'Cola' },
      { id: 'nh-ns-ginger', name: 'ジンジャエール', nameEn: 'Ginger ale' },
      { id: 'nh-ns-oolong', name: 'ウーロン茶', nameEn: 'Oolong tea' },
      { id: 'nh-ns-green-tea', name: '緑茶', nameEn: 'Green tea' },
      { id: 'nh-ns-jasmine', name: 'ジャスミン茶', nameEn: 'Jasmine tea' },
      { id: 'nh-ns-mugicha', name: '麦茶', nameEn: 'Barley tea' },
    ],
  },
];

/** 別料金ショット用タブ id（カタログ本体とは別・客席タブ列のみ） */
export const NOMIHODAI_GUEST_SHOTS_TAB_ID = 'nh-cat-extra-shots';

/** 客席タブの表示順（焼酎 → サワー → カクテル → … → ショット → ノンアル） */
export const NOMIHODAI_GUEST_TAB_ORDER = [
  'nh-cat-beer',
  'nh-cat-highball',
  'nh-cat-shochu',
  'nh-cat-sour',
  'nh-cat-cocktail',
  'nh-cat-wine',
  NOMIHODAI_GUEST_SHOTS_TAB_ID,
  'nh-cat-nonalcoholic',
];

/** 既定カタログの版（localStorage がこれより古い場合は既定へ差し替え） */
export const DEFAULT_NOMIHODAI_CATALOG_VERSION = 16;

/** ノンアル統合ラインナップ（15品） */
export const NOMIHODAI_NONALCOHOL_ITEM_IDS = [
  'nh-ns-nabiru',
  'nh-ns-apple',
  'nh-ns-orange',
  'nh-ns-grapefruit',
  'nh-ns-peach',
  'nh-ns-pine',
  'nh-ns-calpis-water',
  'nh-ns-calpis-soda',
  'nh-ns-yuzu',
  'nh-ns-cola',
  'nh-ns-ginger',
  'nh-ns-oolong',
  'nh-ns-green-tea',
  'nh-ns-jasmine',
  'nh-ns-mugicha',
];
