import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SWEETS_SOLD_COUNTS_STORAGE_KEY,
  fetchSweetsInventoryFromEnv,
  mergeInventoryMap,
  loadSweetsSoldCounts,
} from './takeoutSweetsInventory.js';
import { useTakeoutSweetsMenu } from './TakeoutSweetsMenuContext.jsx';
import { useTakeoutSweetsDisplay } from './useTakeoutSweetsDisplay.js';
import { publishTakeoutInventoryToTabs } from './takeoutSweetsInventoryStorage.js';
import {
  patchInventoryDisplayDelta,
  patchInventoryForDisplayRemainder,
} from './takeoutSweetsStaffStock.js';

function itemLabel(item) {
  return String(item.name || item.id).replace(/\n/g, ' ');
}

/**
 * 厨房専用：テイクアウトスイーツ在庫（注文・会計フローと分離）
 */
export default function TakeoutSweetsStockPanel() {
  const { takeoutInventoryMap, setTakeoutInventoryMap } = useTakeoutSweetsMenu();
  const { sectionsForDisplay } = useTakeoutSweetsDisplay();
  const [filter, setFilter] = useState('');
  const [soldTick, setSoldTick] = useState(0);
  const [applyNotice, setApplyNotice] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const bump = () => setSoldTick((t) => t + 1);
    window.addEventListener('beifutei-sweets-sold-updated', bump);
    const onStorage = (e) => {
      if (e.key === SWEETS_SOLD_COUNTS_STORAGE_KEY || e.key === null) bump();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-sweets-sold-updated', bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const soldCounts = useMemo(() => loadSweetsSoldCounts(), [soldTick, takeoutInventoryMap]);

  const applyDisplayRemainder = useCallback(
    (itemId, displayRemain) => {
      setTakeoutInventoryMap((prev) =>
        patchInventoryForDisplayRemainder(prev, itemId, displayRemain, soldCounts),
      );
    },
    [setTakeoutInventoryMap, soldCounts],
  );

  const bumpDisplay = useCallback(
    (itemId, delta) => {
      setTakeoutInventoryMap((prev) => patchInventoryDisplayDelta(prev, itemId, delta, soldCounts));
    },
    [setTakeoutInventoryMap, soldCounts],
  );

  const onPublishToGuest = useCallback(async () => {
    setPublishing(true);
    try {
      const remote = await fetchSweetsInventoryFromEnv();
      const map = remote ? mergeInventoryMap(remote) : takeoutInventoryMap;
      if (remote) setTakeoutInventoryMap(map);
      publishTakeoutInventoryToTabs(map);
      setApplyNotice('ok');
      window.setTimeout(() => setApplyNotice(null), 4000);
    } finally {
      setPublishing(false);
    }
  }, [takeoutInventoryMap, setTakeoutInventoryMap]);

  const q = filter.trim().toLowerCase();
  const sections = useMemo(() => {
    if (!q) return sectionsForDisplay;
    return sectionsForDisplay
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => {
          const hay = `${itemLabel(it)} ${it.id}`.toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sectionsForDisplay, q]);

  const lowCount = useMemo(
    () =>
      sectionsForDisplay.reduce((n, sec) => n + sec.items.filter((it) => (it.stock ?? 0) <= 0).length, 0),
    [sectionsForDisplay],
  );

  return (
    <div className="ts-stock-panel">
      <header className="ts-stock-panel__head">
        <div>
          <h2 className="ts-stock-panel__title">テイクアウトスイーツ在庫</h2>
          <p className="ts-stock-panel__lead">
            ＋／−／切で在庫を編集し、<strong>「客席に反映」</strong>で客席タブレットと厨房の「カフェ・テイクアウト」へ送ります。
            注文一覧・各卓の会計には影響しません。
          </p>
        </div>
        <div className="ts-stock-panel__head-actions">
          <button
            type="button"
            className="ts-stock-panel__apply"
            disabled={publishing}
            onClick={onPublishToGuest}
          >
            {publishing ? '反映中…' : '客席に反映'}
          </button>
          {applyNotice === 'ok' ? (
            <span className="ts-stock-panel__apply-ok" role="status">
              反映しました
            </span>
          ) : null}
          {lowCount > 0 ? (
            <span className="ts-stock-panel__alert" role="status">
              品切れ {lowCount}
            </span>
          ) : null}
        </div>
      </header>

      <label className="ts-stock-panel__search">
        <span className="ts-stock-panel__search-lab">品名で絞り込み</span>
        <input
          type="search"
          className="ts-stock-panel__search-in"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="例：いちご、クッキー"
          autoComplete="off"
        />
      </label>

      <div className="ts-stock-panel__sections">
        {sections.length === 0 ? (
          <p className="ts-stock-panel__empty">該当する品目がありません</p>
        ) : (
          sections.map((sec) => (
            <section key={sec.id} className="ts-stock-panel__sec">
              <h3 className="ts-stock-panel__sec-title">{sec.titleJa || sec.titleKey || sec.id}</h3>
              <ul className="ts-stock-panel__list">
                {sec.items.map((it) => {
                  const rem = Math.max(0, Math.floor(it.stock ?? 0));
                  const soldOut = rem <= 0;
                  return (
                    <li
                      key={it.id}
                      className={`ts-stock-row${soldOut ? ' ts-stock-row--soldout' : ''}${rem <= 3 && !soldOut ? ' ts-stock-row--low' : ''}`}
                    >
                      <div className="ts-stock-row__info">
                        <span className="ts-stock-row__name">{itemLabel(it)}</span>
                        <span className="ts-stock-row__id">{it.id}</span>
                      </div>
                      <div className="ts-stock-row__ctrl" role="group" aria-label={`${itemLabel(it)}の在庫`}>
                        <button
                          type="button"
                          className="ts-stock-row__btn"
                          disabled={rem <= 0}
                          aria-label="1減らす"
                          onClick={() => bumpDisplay(it.id, -1)}
                        >
                          −
                        </button>
                        <span className="ts-stock-row__num" aria-live="polite">
                          {rem}
                        </span>
                        <button type="button" className="ts-stock-row__btn" aria-label="1増やす" onClick={() => bumpDisplay(it.id, 1)}>
                          ＋
                        </button>
                        <button
                          type="button"
                          className="ts-stock-row__zero"
                          onClick={() => applyDisplayRemainder(it.id, 0)}
                          title="品切れ（残0）"
                        >
                          切
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
