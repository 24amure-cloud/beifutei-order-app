/** オーナーがメニューを反映したとき、同一オリジンの客席・厨房タブへ通知 */
const CHANNEL_NAME = 'beifutei-menu-master-v1';

/** @typedef {'drink' | 'nomihodai' | 'all'} MenuPublishKind */

/**
 * @param {MenuPublishKind} kind
 */
export function notifyMenuPublished(kind) {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: 'published', kind, at: Date.now() });
    bc.close();
  } catch {
    /* BroadcastChannel 非対応環境は storage イベントのみに任せる */
  }
}

/**
 * @param {(msg: { type: string; kind?: MenuPublishKind; at?: number }) => void} handler
 * @returns {() => void}
 */
export function subscribeMenuPublished(handler) {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => handler(ev.data);
    return () => bc.close();
  } catch {
    return () => {};
  }
}
