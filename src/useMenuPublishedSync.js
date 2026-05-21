import { useEffect } from 'react';
import { subscribeMenuPublished } from './menuMasterBroadcast.js';

/** @typedef {import('./menuMasterBroadcast.js').MenuPublishKind} MenuPublishKind */

/**
 * オーナー反映後に客席・厨房タブへメニューを再読み込みする。
 * @param {() => void} sync
 * @param {MenuPublishKind | MenuPublishKind[]} kinds
 * @param {string | string[] | null} [storageKeys] null のときは storage イベントで常に sync
 */
export function useMenuPublishedSync(sync, kinds, storageKeys = null) {
  const kindList = Array.isArray(kinds) ? kinds : [kinds];

  useEffect(() => {
    const matchesKind = (kind) =>
      kind === 'all' || kindList.includes('all') || (kind != null && kindList.includes(kind));

    const onStorage = (e) => {
      if (storageKeys == null) {
        if (e.key == null) sync();
        return;
      }
      const keys = Array.isArray(storageKeys) ? storageKeys : [storageKeys];
      if (e.key == null || keys.includes(e.key)) sync();
    };

    const unsub = subscribeMenuPublished((msg) => {
      if (msg?.kind && matchesKind(msg.kind)) sync();
    });

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', sync);
      unsub();
    };
  }, [sync, kindList.join('|'), storageKeys == null ? '' : Array.isArray(storageKeys) ? storageKeys.join('|') : storageKeys]);
}
