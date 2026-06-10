/** 厨房・カフェテイクアウト：油そばお持ち帰り（店内価格と同じ） */
export const KITCHEN_ABURASOBA_TAKEOUT = [
  {
    key: 'normal',
    name: '米風亭 油そば',
    note: 'お持ち帰り',
    prices: { 小: 980, 並: 1130, 大: 1330 },
  },
  {
    key: 'spicy',
    name: '辛々担々 油そば',
    note: 'お持ち帰り',
    prices: { 小: 980, 並: 1180, 大: 1380 },
  },
  {
    key: 'cheese',
    name: 'チーズ 油そば',
    note: 'お持ち帰り',
    prices: { 小: 980, 並: 1180, 大: 1380 },
  },
];

export const KITCHEN_TAKEOUT_CONTAINER_ITEMS = [
  { id: 'to-container-100', name: 'お持ち帰り容器（小）', price: 100 },
  { id: 'to-container-200', name: 'お持ち帰り容器（大）', price: 200 },
];

/** 油そばトッピング（店内と同価格） */
export const KITCHEN_ABURASOBA_TOPPINGS = [
  { id: 'to-top-chashu', name: '細切りチャーシュー', price: 300 },
  { id: 'to-top-spicy', name: '辛みそひき肉', price: 300 },
  { id: 'to-top-menma', name: 'メンマ', price: 200 },
  { id: 'to-top-nori', name: 'のり2枚', price: 200 },
  { id: 'to-top-egg', name: 'うずら味玉', price: 200 },
  { id: 'to-top-garlic', name: 'フライドガーリック', price: 150 },
  { id: 'to-top-mayo', name: 'マヨネーズ', price: 150 },
  { id: 'to-top-cheese', name: '粉チーズ', price: 150 },
];

/** 口頭注文クイック選択（タップでカートへ） */
export const KITCHEN_RETAIL_VERBAL_PICKS = [
  ...KITCHEN_TAKEOUT_CONTAINER_ITEMS.map((it) => ({ ...it, itemId: it.id, itemName: it.name })),
  ...KITCHEN_ABURASOBA_TOPPINGS.slice(0, 3).map((it) => ({ itemId: it.id, itemName: it.name, price: it.price })),
  { itemId: 'ts-sc-wakeari', itemName: '訳アリスコーン', price: 680 },
  { itemId: 'cafe-ameri-hot-M', itemName: 'コーヒー（HOT/M）', price: 420 },
  { itemId: 'cafe-latte-hot-M', itemName: 'カフェラテ（HOT/M）', price: 540 },
  { itemId: 'fr-soft-コーン', itemName: 'ジェラ生ソフト（コーン）', price: 460 },
  { itemId: 'to-abu-normal-並', itemName: '米風亭 油そば（並）', price: 1130 },
  { itemId: 'to-abu-spicy-並', itemName: '辛々担々 油そば（並）', price: 1180 },
];
