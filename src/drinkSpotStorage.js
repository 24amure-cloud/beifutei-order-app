import { DRINK_SPOT_ITEM_IDS } from './data/defaultDrinkMenu.js';
import { notifyMenuPublished } from './menuMasterBroadcast.js';

export const DRINK_SPOT_ENABLED_STORAGE_KEY = 'beifutei-drink-spot-enabled-v1';
export const DRINK_SPOT_UPDATED_EVENT = 'beifutei-drink-spot-updated';

function broadcastDrinkSpotUpdated() {
  try {
    window.dispatchEvent(new CustomEvent(DRINK_SPOT_UPDATED_EVENT));
  } catch {
    /* ignore */
  }
}

function sanitizeEnabled(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of DRINK_SPOT_ITEM_IDS) {
    if (raw[id] === true) out[id] = true;
  }
  return out;
}

/** @returns {Record<string, true>} 客席に出すスポット品のみ true */
export function loadDrinkSpotEnabled() {
  try {
    const raw = localStorage.getItem(DRINK_SPOT_ENABLED_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeEnabled(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveDrinkSpotEnabled(map) {
  localStorage.setItem(DRINK_SPOT_ENABLED_STORAGE_KEY, JSON.stringify(sanitizeEnabled(map)));
  broadcastDrinkSpotUpdated();
}

export function setDrinkSpotItemEnabled(itemId, enabled) {
  const next = { ...loadDrinkSpotEnabled() };
  if (enabled) next[itemId] = true;
  else delete next[itemId];
  saveDrinkSpotEnabled(next);
  return next;
}

/** 厨房：客席ドリンクページへ反映 */
export function publishDrinkSpotToGuest() {
  saveDrinkSpotEnabled(loadDrinkSpotEnabled());
  notifyMenuPublished('drink');
}

export function isDrinkSpotItemEnabled(itemId, enabledMap = loadDrinkSpotEnabled()) {
  return enabledMap[itemId] === true;
}
