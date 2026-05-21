/** オーナーがメニューを反映したとき、同一オリジンの客席・厨房タブへ通知 */
const CHANNEL_NAME = 'beifutei-menu-master-v1';

/** @typedef {'drink' | 'nomihodai' | 'takeout' | 'sidedish' | 'all'} MenuPublishKind */

/** @typedef {{ type: 'published'; kind: MenuPublishKind; at: number }} MenuPublishedMessage */

export const MENU_PUBLISHED_EVENT = 'beifutei-menu-published';

/** @type {BroadcastChannel | null} */
let publishChannel = null;

function getPublishChannel() {
  if (publishChannel) return publishChannel;
  try {
    publishChannel = new BroadcastChannel(CHANNEL_NAME);
    return publishChannel;
  } catch {
    return null;
  }
}

/**
 * @param {MenuPublishKind} kind
 */
export function notifyMenuPublished(kind) {
  const msg = /** @type {MenuPublishedMessage} */ ({ type: 'published', kind, at: Date.now() });
  const ch = getPublishChannel();
  if (ch) ch.postMessage(msg);
  try {
    window.dispatchEvent(new CustomEvent(MENU_PUBLISHED_EVENT, { detail: msg }));
  } catch {
    /* ignore */
  }
}

/**
 * @param {(msg: MenuPublishedMessage) => void} handler
 * @returns {() => void}
 */
export function subscribeMenuPublished(handler) {
  let bc = null;
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => handler(ev.data);
  } catch {
    /* ignore */
  }
  const onCustom = (ev) => handler(ev.detail);
  window.addEventListener(MENU_PUBLISHED_EVENT, onCustom);
  return () => {
    if (bc) bc.close();
    window.removeEventListener(MENU_PUBLISHED_EVENT, onCustom);
  };
}
