import React, { useMemo } from 'react';

const ORDER_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function labelIsHot(hotTableLabels, label) {
  if (hotTableLabels == null) return false;
  const L = String(label);
  if (hotTableLabels instanceof Set) return hotTableLabels.has(L);
  if (Array.isArray(hotTableLabels)) return hotTableLabels.some((x) => String(x) === L);
  return false;
}

/** 卓メモを全画面で共有表示（セッションの tableMemoByLabel を参照） */
export default function TableMemoRibbon({ tableMemoByLabel, hotTableLabels }) {
  const chips = useMemo(() => {
    const m = tableMemoByLabel || {};
    const out = [];
    for (const label of ORDER_LABELS) {
      const raw = m[label];
      const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
      if (text) out.push({ label, text });
    }
    return out;
  }, [tableMemoByLabel]);

  if (chips.length === 0) return null;

  return (
    <div className="table-memo-ribbon" role="region" aria-label="卓メモ（会計まで共有）">
      <span className="table-memo-ribbon__title">卓メモ</span>
      <ul className="table-memo-ribbon__list">
        {chips.map(({ label, text }) => (
          <li
            key={label}
            className={[
              'table-memo-ribbon__chip',
              labelIsHot(hotTableLabels, label) ? 'table-memo-ribbon__chip--hot' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="table-memo-ribbon__lbl">卓{label}</span>
            <span className="table-memo-ribbon__txt">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
