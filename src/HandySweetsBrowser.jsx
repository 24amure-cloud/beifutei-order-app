import React, { useMemo } from 'react';
import HandyCategoryLineupBrowser from './HandyCategoryLineupBrowser.jsx';
import HandySweetsManualEntry from './HandySweetsManualEntry.jsx';
import { useTakeoutSweetsDisplay } from './useTakeoutSweetsDisplay.js';

function cleanSweetsName(name) {
  return String(name ?? '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sweetsItemToPick(item, section) {
  return {
    itemId: item.id,
    itemName: cleanSweetsName(item.name),
    price: item.price,
    kind: 'food',
    groupId: 'sweets',
    sectionTitle: section.fullTitle || section.label,
    soldOut: false,
  };
}

/**
 * スイーツ：カテゴリタブ → 手入力 + ラインナップ（品切れ表示なし）
 * @param {{
 *   renderItemList: (items: object[], opts?: object) => React.ReactNode,
 *   onAddCustomPick: (name: string, price: string, meta?: object) => boolean | void,
 * }} props
 */
export default function HandySweetsBrowser({ renderItemList, onAddCustomPick }) {
  const { sectionsForDisplay } = useTakeoutSweetsDisplay();

  const sections = useMemo(
    () =>
      (sectionsForDisplay || [])
        .filter((s) => (s.items || []).length > 0)
        .map((sec) => ({
          id: sec.id,
          label: sec.titleJa || sec.titleKey || sec.id,
          fullTitle: sec.titleJa || sec.titleKey || sec.id,
          items: sec.items || [],
        })),
    [sectionsForDisplay],
  );

  const renderAfterLineup = useMemo(
    () => (section) => (
      <HandySweetsManualEntry
        key={section.id}
        sectionLabel={section.label}
        onAdd={(name, price) =>
          onAddCustomPick(name, price, { groupId: 'sweets', kind: 'food', defaultName: section.label })
        }
      />
    ),
    [onAddCustomPick],
  );

  return (
    <HandyCategoryLineupBrowser
      sections={sections}
      itemToPick={sweetsItemToPick}
      renderItemList={renderItemList}
      renderAfterLineup={renderAfterLineup}
      ariaLabel="スイーツカテゴリ"
      emptyMessage="スイーツメニューがありません"
    />
  );
}
