import { SWEETS_INVENTORY_MASTER } from './takeoutSweetsInventory.js';

export const TAKEOUT_INVENTORY_STORAGE_KEY = 'beifutei-takeout-sweets-inventory-v1';

function sanitizeMap(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const id = String(k);
    if (!id.startsWith('ts-')) continue;
    const n = Math.max(0, Math.floor(Number(v) || 0));
    out[id] = n;
  }
  return out;
}

export function loadTakeoutInventoryMap() {
  try {
    const raw = localStorage.getItem(TAKEOUT_INVENTORY_STORAGE_KEY);
    if (!raw) return { ...SWEETS_INVENTORY_MASTER };
    const parsed = JSON.parse(raw);
    return { ...SWEETS_INVENTORY_MASTER, ...sanitizeMap(parsed) };
  } catch {
    return { ...SWEETS_INVENTORY_MASTER };
  }
}

export function saveTakeoutInventoryMap(map) {
  localStorage.setItem(TAKEOUT_INVENTORY_STORAGE_KEY, JSON.stringify(sanitizeMap(map)));
}

export function inventoryMapFromSections(sections) {
  const out = { ...SWEETS_INVENTORY_MASTER };
  for (const sec of sections || []) {
    for (const it of sec.items || []) {
      if (typeof it.stock === 'number' && Number.isFinite(it.stock) && it.stock >= 0) {
        out[it.id] = Math.floor(it.stock);
      }
    }
  }
  return out;
}
