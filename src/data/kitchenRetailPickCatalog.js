/** 厨房カフェ・ソフトクリーム — 伝票後入力／ハンディ用の固定品目一覧 */

export const CAFE_PRICE_BY_SIZE = {
  americano: { M: 420, L: 540 },
  latte: { M: 540, L: 640 },
  strawberry: { M: 580, L: 680 },
  chocolata: { M: 580, L: 680 },
};

const CAFE_TEMPS = ['hot', 'ice'];
const RETAIL_GROUP_ID = 'retail';

function buildCafeAmericanoItems() {
  const items = [];
  for (const temp of CAFE_TEMPS) {
    for (const size of ['M', 'L']) {
      items.push({
        itemId: `cafe-ameri-${temp}-${size}`,
        itemName: `コーヒー（${temp.toUpperCase()}/${size}）`,
        price: CAFE_PRICE_BY_SIZE.americano[size],
        kind: 'drink',
        groupId: RETAIL_GROUP_ID,
        sectionTitle: 'コーヒー',
      });
    }
  }
  return items;
}

function buildCafeLatteItems() {
  const items = [];
  for (const temp of CAFE_TEMPS) {
    for (const size of ['M', 'L']) {
      items.push({
        itemId: `cafe-latte-${temp}-${size}`,
        itemName: `カフェラテ（${temp.toUpperCase()}/${size}）`,
        price: CAFE_PRICE_BY_SIZE.latte[size],
        kind: 'drink',
        groupId: RETAIL_GROUP_ID,
        sectionTitle: 'カフェラテ',
      });
    }
  }
  return items;
}

function buildCafeSizeOnlyItems(def) {
  return ['M', 'L'].map((size) => ({
    itemId: `cafe-${def.id}-${size}`,
    itemName: `${def.name}（${size}）`,
    price: CAFE_PRICE_BY_SIZE[def.id][size],
    kind: 'drink',
    groupId: RETAIL_GROUP_ID,
    sectionTitle: def.name,
  }));
}

export const KITCHEN_CAFE_PICK_ITEMS = [
  ...buildCafeAmericanoItems(),
  ...buildCafeLatteItems(),
  ...buildCafeSizeOnlyItems({ id: 'strawberry', name: '生いちごミルク' }),
  ...buildCafeSizeOnlyItems({ id: 'chocolata', name: 'ラテチョコラータ' }),
];

export const KITCHEN_SOFT_PICK_ITEMS = [
  { itemId: 'fr-fruit-ミニ', itemName: '本日のソフトクリーム（ミニ）', price: 660, kind: 'food', groupId: RETAIL_GROUP_ID, sectionTitle: 'ソフトクリーム' },
  { itemId: 'fr-fruit-レギュラー', itemName: '本日のソフトクリーム（レギュラー）', price: 880, kind: 'food', groupId: RETAIL_GROUP_ID, sectionTitle: 'ソフトクリーム' },
  { itemId: 'fr-soft-コーン', itemName: 'ジェラ生ソフト（コーン）', price: 460, kind: 'food', groupId: RETAIL_GROUP_ID, sectionTitle: 'ソフトクリーム' },
  { itemId: 'fr-soft-カップ', itemName: 'ジェラ生ソフト（カップ）', price: 460, kind: 'food', groupId: RETAIL_GROUP_ID, sectionTitle: 'ソフトクリーム' },
  { itemId: 'fr-affogato', itemName: 'アフォガード', price: 680, kind: 'food', groupId: RETAIL_GROUP_ID, sectionTitle: 'ソフトクリーム' },
];

export function buildKitchenRetailPickSections() {
  return [
    { id: 'retail-cafe-coffee', title: 'コーヒー', groupId: RETAIL_GROUP_ID, items: buildCafeAmericanoItems() },
    { id: 'retail-cafe-latte', title: 'カフェラテ', groupId: RETAIL_GROUP_ID, items: buildCafeLatteItems() },
    {
      id: 'retail-cafe-milk',
      title: 'ミルク・チョコ',
      groupId: RETAIL_GROUP_ID,
      items: [
        ...buildCafeSizeOnlyItems({ id: 'strawberry', name: '生いちごミルク' }),
        ...buildCafeSizeOnlyItems({ id: 'chocolata', name: 'ラテチョコラータ' }),
      ],
    },
    { id: 'retail-soft', title: 'ソフトクリーム', groupId: RETAIL_GROUP_ID, items: KITCHEN_SOFT_PICK_ITEMS },
  ];
}
