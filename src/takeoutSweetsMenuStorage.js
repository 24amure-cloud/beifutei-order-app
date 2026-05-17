import { DEFAULT_TAKEOUT_SWEETS_SECTIONS } from './data/defaultTakeoutSweetsMenu.js';

export const TAKEOUT_SWEETS_MENU_STORAGE_KEY = 'beifutei-takeout-sweets-menu-v1';

function isValidItem(it) {
  return (
    it &&
    typeof it.id === 'string' &&
    it.id.startsWith('ts-') &&
    typeof it.name === 'string' &&
    typeof it.price === 'number' &&
    Number.isFinite(it.price)
  );
}

function isValidSection(s) {
  return s && typeof s.id === 'string' && Array.isArray(s.items) && s.items.every(isValidItem);
}

export function loadTakeoutSweetsSections() {
  try {
    const raw = localStorage.getItem(TAKEOUT_SWEETS_MENU_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
    const cleaned = parsed.filter(isValidSection).map((sec) => ({
      ...sec,
      items: sec.items.filter(isValidItem),
    }));
    return cleaned.length ? cleaned : structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
  } catch {
    return structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
  }
}

export function saveTakeoutSweetsSections(sections) {
  localStorage.setItem(TAKEOUT_SWEETS_MENU_STORAGE_KEY, JSON.stringify(sections));
}

/** 全セクションの品目をフラット配列で */
export function flattenTakeoutSections(sections) {
  return (sections || []).flatMap((sec) => sec.items || []);
}
