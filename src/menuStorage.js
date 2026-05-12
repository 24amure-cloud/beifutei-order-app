import { DEFAULT_DRINK_MENU_SECTIONS } from './data/defaultDrinkMenu.js';

export const DRINK_MENU_STORAGE_KEY = 'beifutei-menu-drink-sections-v1';

function isValidItem(it) {
  return (
    it &&
    typeof it.id === 'string' &&
    it.id.length > 0 &&
    typeof it.name === 'string' &&
    (it.nameEn == null || typeof it.nameEn === 'string') &&
    (it.price === null || (typeof it.price === 'number' && Number.isFinite(it.price)))
  );
}

function isValidSection(s) {
  if (!s || typeof s.id !== 'string' || !s.id) return false;
  if (typeof s.titleJa !== 'string' || typeof s.titleEn !== 'string') return false;
  if (s.hint != null && typeof s.hint !== 'string') return false;
  if (s.hintEn != null && typeof s.hintEn !== 'string') return false;
  if (!Array.isArray(s.items)) return false;
  return s.items.every(isValidItem);
}

/** localStorage から読込。壊れている場合はデフォルト */
export function loadDrinkMenuSections() {
  try {
    const raw = localStorage.getItem(DRINK_MENU_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DRINK_MENU_SECTIONS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return structuredClone(DEFAULT_DRINK_MENU_SECTIONS);
    const cleaned = parsed.filter(isValidSection).map((sec) => ({
      ...sec,
      items: sec.items.filter(isValidItem),
    }));
    if (cleaned.length === 0) return structuredClone(DEFAULT_DRINK_MENU_SECTIONS);
    return cleaned;
  } catch {
    return structuredClone(DEFAULT_DRINK_MENU_SECTIONS);
  }
}

export function saveDrinkMenuSections(sections) {
  localStorage.setItem(DRINK_MENU_STORAGE_KEY, JSON.stringify(sections));
}
