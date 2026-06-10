/** ドリンクメニュー初期データ（店頭メニュー準拠・税込） */
/** `nameEn` … 卓タブレット英語 UI 用（未設定時は `name` を表示）。厨房・注文は `name`（日本語）のまま。 */

import { DEFAULT_DRINK_COCKTAIL_ITEMS } from './defaultDrinkCocktailItems.js';

export const DEFAULT_DRINK_MENU_VERSION = 9;

/** 客席ドリンク：1行3カテゴリ（カクテルは単独行・2ヒーロー） */
export const DRINK_MENU_GUEST_ROWS = [
  ['whisky', 'beer', 'sake'],
  ['shochu', 'sour', 'soft'],
  ['cocktail'],
];

export const DEFAULT_DRINK_MENU_SECTIONS = [
  {
    id: 'whisky',
    titleEn: 'HIGHBALL / WHISKY',
    titleJa: 'ハイボール / ウイスキー',
    items: [
      { id: 'pd-hb-nikka', name: 'ブラックニッカ', nameEn: 'Black Nikka', price: 600 },
      { id: 'pd-hb-jim', name: 'ジムビーム', nameEn: 'Jim Beam', price: 700 },
      { id: 'pd-hb-kaku', name: '角ハイボール', nameEn: 'Kakubin highball', price: 700 },
      { id: 'pd-wh-makers', name: 'メーカーズマーク', nameEn: "Maker's Mark", price: 700 },
      { id: 'pd-wh-harper', name: 'I.W.ハーパー', nameEn: 'I.W. Harper', price: 700 },
      { id: 'pd-wh-wildturkey', name: 'ワイルドターキー', nameEn: 'Wild Turkey', price: 700 },
      { id: 'pd-wh-ao', name: '碧 AO', nameEn: 'Ao', price: 900 },
      { id: 'pd-wh-ardbeg10', name: 'アードベッグ TEN', nameEn: 'Ardbeg Ten', price: 900 },
      { id: 'pd-wh-jack', name: 'ジャックダニエル', nameEn: 'Jack Daniel\'s', price: 700 },
      { id: 'pd-wh-canadian', name: 'カナディアンクラブ', nameEn: 'Canadian Club', price: 800 },
      { id: 'pd-wh-dewars-8', name: 'デュワーズ ポルトガルスムース（8年）', nameEn: 'Dewar\'s Portuguese Smooth (8y)', price: 700 },
      { id: 'pd-wh-dewars-12', name: 'デュワーズ 12年', nameEn: 'Dewar\'s 12', price: 800 },
    ],
  },
  {
    id: 'beer',
    titleEn: 'BEER',
    titleJa: 'ビール',
    items: [
      { id: 'pd-beer-glass', name: 'グラスビール（一番搾り）', nameEn: 'Draft beer (Kirin Ichiban)', price: 680 },
      { id: 'pd-beer-asahi', name: 'アサヒスーパードライ（中瓶）', nameEn: 'Asahi Super Dry (medium bottle)', price: 800 },
      { id: 'pd-beer-classic', name: 'サッポロクラシック（中瓶）', nameEn: 'Sapporo Classic (medium bottle)', price: 800 },
      { id: 'pd-beer-lager', name: 'サッポロラガー（中瓶）', nameEn: 'Sapporo Lager (medium bottle)', price: 800 },
      { id: 'pd-beer-corona', name: 'コロナ', nameEn: 'Corona', price: 800 },
      { id: 'pd-beer-moretti', name: 'モレッティ', nameEn: 'Moretti', price: 800 },
      { id: 'pd-beer-heineken', name: 'ハイネケン', nameEn: 'Heineken', price: 800 },
      { id: 'pd-beer-bud', name: 'バドワイザー', nameEn: 'Budweiser', price: 800 },
      { id: 'pd-beer-shandy', name: 'シャンディガフ', nameEn: 'Shandy gaff', price: 700 },
      { id: 'pd-beer-redeye', name: 'レッドアイ', nameEn: 'Red eye', price: 700 },
    ],
  },
  {
    id: 'sake',
    titleEn: 'SAKE',
    titleJa: '日本酒',
    items: [
      { id: 'pd-sake-denshu', name: '田酒 特別純米酒 げんしゅ', nameEn: 'Denshu genshu', price: 800 },
      { id: 'pd-sake-kitanokatsu', name: '北の勝', nameEn: 'Kitanokatsu', price: 700 },
      { id: 'pd-sake-jozen', name: '上善如水 純米吟醸', nameEn: 'Jozen Mizunogotoshi', price: 700 },
      { id: 'pd-sake-otokoyama', name: '男山 特別純米', nameEn: 'Otokoyama tokubetsu junmai', price: 700 },
      { id: 'pd-sake-macho', name: 'Macho（マッチョ）雄町', nameEn: 'Macho Omachi', price: 800 },
      { id: 'pd-sake-kamikawa', name: '上川大雪 特別純米 一辛口', nameEn: 'Kamikawa Taisetsu', price: 800 },
      { id: 'pd-sake-asahikawa', name: 'あさひかわ 純米大吟醸', nameEn: 'Asahikawa daiginjo', price: 800 },
      { id: 'pd-sake-shinhidaka', name: '新ひだか サラブレッドロード', nameEn: 'Shin-Hidaka Thoroughbred Road', price: 700 },
    ],
  },
  {
    id: 'shochu',
    titleEn: 'SHOCHU',
    titleJa: '焼酎',
    hint: 'ロック／水割り／ソーダ割り',
    hintEn: 'On the rocks / with water / soda',
    items: [
      { id: 'pd-shochu-rento', name: 'れんと（黒糖）', nameEn: 'Rento (brown sugar)', price: 700 },
      { id: 'pd-shochu-yurubi', name: 'ゆるび（芋）', nameEn: 'Yurubi (sweet potato)', price: 700 },
      { id: 'pd-shochu-kitazato', name: '喜多里 芋（芋）', nameEn: 'Kitazato (sweet potato)', price: 700 },
      { id: 'pd-shochu-daiyame', name: 'DAIAME -だいやめ-（芋）', nameEn: 'Daiyame (sweet potato)', price: 800 },
      { id: 'pd-shochu-nikaido', name: '二階堂（麦）', nameEn: 'Nikaido (barley)', price: 700 },
      { id: 'pd-shochu-aka', name: '赤霧島（芋）', nameEn: 'Aka Kirishima (sweet potato)', price: 700 },
      { id: 'pd-shochu-kuro', name: '黒霧島（芋）', nameEn: 'Kuro Kirishima (sweet potato)', price: 700 },
      { id: 'pd-shochu-akato', name: '赤兎馬（芋）', nameEn: 'Akato (sweet potato)', price: 800 },
      { id: 'pd-shochu-iichiko', name: 'いいちこ（麦）', nameEn: 'Iichiko (barley)', price: 700 },
      { id: 'pd-shochu-kimoto', name: '一刻者（芋）', nameEn: 'Kimoto (sweet potato)', price: 700 },
      { id: 'pd-shochu-takagi', name: '鍛高譚（紫蘇）', nameEn: 'Takagi shiso', price: 700 },
    ],
  },
  {
    id: 'sour',
    titleEn: 'SOUR',
    titleJa: 'サワー',
    items: [
      { id: 'pd-sour-lemon', name: 'レモンサワー', nameEn: 'Lemon sour', price: 600 },
      { id: 'pd-sour-yuzu', name: 'ゆずサワー', nameEn: 'Yuzu sour', price: 600 },
      { id: 'pd-sour-ume', name: '梅サワー', nameEn: 'Plum sour', price: 600 },
      { id: 'pd-sour-gf', name: 'グレープフルーツサワー', nameEn: 'Grapefruit sour', price: 600 },
      { id: 'pd-sour-lime', name: 'ライムサワー', nameEn: 'Lime sour', price: 600 },
      { id: 'pd-sour-kyoho', name: '巨峰サワー', nameEn: 'Kyoho grape sour', price: 600 },
      { id: 'pd-sour-peach', name: '桃サワー', nameEn: 'Peach sour', price: 600 },
    ],
  },
  {
    id: 'cocktail',
    titleEn: 'COCKTAIL',
    titleJa: 'カクテル',
    items: structuredClone(DEFAULT_DRINK_COCKTAIL_ITEMS),
  },
  {
    id: 'soft',
    titleEn: 'SOFT DRINK',
    titleJa: 'ソフトドリンク',
    items: [
      { id: 'pd-soft-nabiru', name: 'ノンアルビール', nameEn: 'Non-alcoholic beer', price: 500 },
      { id: 'pd-soft-apple', name: 'りんご', nameEn: 'Apple', price: 500 },
      { id: 'pd-soft-orange', name: 'オレンジ', nameEn: 'Orange', price: 500 },
      { id: 'pd-soft-grapefruit', name: 'グレープフルーツ', nameEn: 'Grapefruit', price: 500 },
      { id: 'pd-soft-peach', name: '桃ソーダ', nameEn: 'Peach soda', price: 500 },
      { id: 'pd-soft-pine', name: 'パインソーダ', nameEn: 'Pineapple soda', price: 500 },
      { id: 'pd-soft-calpis-water', name: 'カルピスウォーター', nameEn: 'Calpis water', price: 500 },
      { id: 'pd-soft-calpis-soda', name: 'カルピスソーダ', nameEn: 'Calpis soda', price: 500 },
      { id: 'pd-soft-yuzu', name: 'ゆずソーダ', nameEn: 'Yuzu soda', price: 500 },
      { id: 'pd-soft-cola', name: 'コーラ', nameEn: 'Cola', price: 500 },
      { id: 'pd-soft-ginger', name: 'ジンジャーエール', nameEn: 'Ginger ale', price: 500 },
      { id: 'pd-soft-oolong', name: 'ウーロン茶', nameEn: 'Oolong tea', price: 500 },
      { id: 'pd-soft-green', name: '緑茶', nameEn: 'Green tea', price: 500 },
      { id: 'pd-soft-jasmine', name: 'ジャスミン茶', nameEn: 'Jasmine tea', price: 500 },
      { id: 'pd-soft-mugicha', name: '麦茶', nameEn: 'Barley tea', price: 500 },
    ],
  },
  {
    id: 'spot',
    titleEn: 'SPOT',
    titleJa: 'スポット（限定）',
    staffOnly: true,
    items: [
      { id: 'pd-spot-torikai', name: '鳥飼（米）', nameEn: 'Torikai (rice shochu)', price: 800 },
      { id: 'pd-spot-chita', name: '知多', nameEn: 'Chita', price: 1000 },
      { id: 'pd-spot-yoichi', name: '余市', nameEn: 'Yoichi', price: 1300 },
      { id: 'pd-spot-taketsuru', name: '竹鶴', nameEn: 'Taketsuru', price: 1300 },
      { id: 'pd-spot-miyagikyo', name: '宮城峡', nameEn: 'Miyagikyo', price: 1300 },
      { id: 'pd-spot-macallan12', name: 'マッカラン 12年', nameEn: 'Macallan 12', price: 1500 },
      { id: 'pd-spot-hakushu', name: '白州', nameEn: 'Hakushu', price: 1500 },
      { id: 'pd-spot-yamazaki', name: '山崎', nameEn: 'Yamazaki', price: 1500 },
      { id: 'pd-spot-ardbeg-anoa', name: 'アードベッグ ANOA', nameEn: 'Ardbeg An Oa', price: 1400 },
      { id: 'pd-spot-jack-honey', name: 'ジャックダニエルハニー', nameEn: 'Jack Daniel\'s Honey', price: 800 },
      { id: 'pd-spot-ballantine', name: 'バランタイン', nameEn: 'Ballantine\'s', price: 700 },
      { id: 'pd-spot-chivas', name: 'シーバスリーガル', nameEn: 'Chivas Regal', price: 700 },
      { id: 'pd-spot-jameson', name: 'ジェムソン', nameEn: 'Jameson', price: 700 },
    ],
  },
];

/** スポット品 id 一覧（客席 ON/OFF 用） */
export const DRINK_SPOT_ITEM_IDS = DEFAULT_DRINK_MENU_SECTIONS.find((s) => s.id === 'spot')?.items?.map((it) => it.id) ?? [];
