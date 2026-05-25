import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMenuMaster } from './MenuMasterContext.jsx';
import {
  loadDrinkSpotEnabled,
  publishDrinkSpotToGuest,
  setDrinkSpotItemEnabled,
} from './drinkSpotStorage.js';

function itemLabel(item) {
  return String(item.name || item.id).replace(/\n/g, ' ');
}

/**
 * 厨房専用：スポット品の客席ドリンクページへの表示 ON/OFF
 */
export default function DrinkSpotPanel() {
  const { drinkSections } = useMenuMaster();
  const spotSec = useMemo(() => drinkSections.find((s) => s.id === 'spot'), [drinkSections]);
  const [enabled, setEnabled] = useState(() => loadDrinkSpotEnabled());
  const [applyNotice, setApplyNotice] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setEnabled(loadDrinkSpotEnabled());
  }, [spotSec]);

  const onToggle = useCallback((itemId, nextOn) => {
    setEnabled(setDrinkSpotItemEnabled(itemId, nextOn));
  }, []);

  const onPublish = useCallback(() => {
    setPublishing(true);
    try {
      publishDrinkSpotToGuest();
      setApplyNotice('ok');
      window.setTimeout(() => setApplyNotice(null), 4000);
    } finally {
      setPublishing(false);
    }
  }, []);

  const onCount = Object.keys(enabled).length;
  const items = spotSec?.items ?? [];

  return (
    <div className="ts-stock-panel drink-spot-panel">
      <header className="ts-stock-panel__head">
        <div>
          <h2 className="ts-stock-panel__title">スポット品（限定ドリンク）</h2>
          <p className="ts-stock-panel__lead">
            ONにした品目だけ客席の<strong>ドリンクページ</strong>に表示されます。OFFの品は厨房・マスターのみ（客席には出ません）。
            切り替え後は<strong>「客席に反映」</strong>を押してください。
          </p>
        </div>
        <div className="ts-stock-panel__head-actions">
          <button
            type="button"
            className="ts-stock-panel__apply"
            disabled={publishing}
            onClick={onPublish}
          >
            {publishing ? '反映中…' : '客席に反映'}
          </button>
          {applyNotice === 'ok' ? (
            <span className="ts-stock-panel__apply-ok" role="status">
              反映しました
            </span>
          ) : null}
          <span className="drink-spot-panel__count" role="status">
            表示中 {onCount} / {items.length}
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="ts-stock-panel__empty">スポット品がメニューにありません（マスターで spot カテゴリを確認）</p>
      ) : (
        <ul className="ts-stock-panel__list drink-spot-panel__list">
          {items.map((it) => {
            const on = enabled[it.id] === true;
            return (
              <li key={it.id} className={`ts-stock-row drink-spot-row${on ? ' drink-spot-row--on' : ''}`}>
                <div className="ts-stock-row__info">
                  <span className="ts-stock-row__name">{itemLabel(it)}</span>
                  <span className="ts-stock-row__id">
                    {it.id} · ￥{it.price?.toLocaleString?.() ?? it.price}
                  </span>
                </div>
                <button
                  type="button"
                  className={`drink-spot-row__toggle${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => onToggle(it.id, !on)}
                >
                  {on ? 'ON（客席に表示）' : 'OFF'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
