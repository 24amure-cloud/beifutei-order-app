import React, { useMemo } from 'react';
import HandyCategoryLineupBrowser from './HandyCategoryLineupBrowser.jsx';
import { buildKitchenRetailPickSections } from './data/kitchenRetailPickCatalog.js';

function retailItemToPick(item, section) {
  return {
    itemId: item.itemId,
    itemName: item.itemName,
    price: item.price,
    kind: item.kind,
    groupId: item.groupId,
    sectionTitle: section.title || section.label,
  };
}

/**
 * カフェドリンク・ソフトクリーム（厨房テイクアウトと同価格）
 * @param {{ renderItemList: (items: object[], opts?: object) => React.ReactNode }} props
 */
export default function HandyRetailBrowser({ renderItemList }) {
  const sections = useMemo(
    () =>
      buildKitchenRetailPickSections().map((sec) => ({
        id: sec.id,
        label: sec.title,
        fullTitle: sec.title,
        items: sec.items,
      })),
    [],
  );

  return (
    <HandyCategoryLineupBrowser
      sections={sections}
      itemToPick={retailItemToPick}
      renderItemList={renderItemList}
      ariaLabel="カフェ・ソフトカテゴリ"
      emptyMessage="メニューがありません"
    />
  );
}
