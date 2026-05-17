import { useEffect, useMemo, useState } from 'react';
import { useTakeoutSweetsMenu } from './TakeoutSweetsMenuContext.jsx';
import {
  mergeInventoryMap,
  enrichTakeoutItem,
  sortTakeoutItemsByStock,
  fetchSweetsInventoryFromEnv,
  SWEETS_SOLD_COUNTS_STORAGE_KEY,
  inventoryMapAfterSales,
  syncTakeoutInventoryDisplaySnapshot,
} from './takeoutSweetsInventory.js';

const ASSET_BASE = import.meta.env.BASE_URL;

export function takeoutAssetUrl(path) {
  if (!path) return '';
  const normalized = String(path).replace(/^\//, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return ASSET_BASE || '/';
  const encoded = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const base = ASSET_BASE || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${encoded}`;
}

/** テイクアウト：カタログ＋在庫（オーナー反映・API・販売累計） */
export function useTakeoutSweetsDisplay() {
  const { takeoutSections, takeoutInventoryMap } = useTakeoutSweetsMenu();
  const [apiOverlay, setApiOverlay] = useState(null);
  const [soldTick, setSoldTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchSweetsInventoryFromEnv();
      if (!cancelled && remote) setApiOverlay(remote);
    })();
    const poll = setInterval(async () => {
      const remote = await fetchSweetsInventoryFromEnv();
      if (!cancelled && remote) setApiOverlay(remote);
    }, 120000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const bump = () => setSoldTick((x) => x + 1);
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

  const inventoryMap = useMemo(
    () => mergeInventoryMap({ ...takeoutInventoryMap, ...(apiOverlay || {}) }),
    [takeoutInventoryMap, apiOverlay],
  );

  const displayInventoryMap = useMemo(
    () => inventoryMapAfterSales(inventoryMap),
    [inventoryMap, soldTick],
  );

  useEffect(() => {
    syncTakeoutInventoryDisplaySnapshot(inventoryMap);
  }, [inventoryMap]);

  const sectionsForDisplay = useMemo(
    () =>
      (takeoutSections || []).map((sec) => {
        const items = sortTakeoutItemsByStock(
          (sec.items || []).map((it) =>
            enrichTakeoutItem(
              {
                ...it,
                image: it.image ? takeoutAssetUrl(it.image) : '',
              },
              displayInventoryMap,
            ),
          ),
        );
        const isRanked = items.some((it) => it.rank != null);
        return { ...sec, items, isRanked };
      }),
    [takeoutSections, displayInventoryMap],
  );

  return { sectionsForDisplay };
}
