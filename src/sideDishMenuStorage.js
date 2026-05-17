import { DEFAULT_SIDE_DISH_SECTIONS } from './data/defaultSideDishMenu.js';
import { enrichSideDishSections } from './sideDishMenuLabels.js';

export const SIDE_DISH_MENU_STORAGE_KEY = 'beifutei-side-dish-menu-v1';

function isValidItem(it) {
  return (
    it &&
    typeof it.id === 'string' &&
    it.id.length > 0 &&
    typeof it.name === 'string' &&
    typeof it.price === 'number' &&
    Number.isFinite(it.price)
  );
}

function isValidSection(s) {
  return s && typeof s.id === 'string' && typeof s.layout === 'string' && Array.isArray(s.items);
}

export function loadSideDishSections() {
  try {
    const raw = localStorage.getItem(SIDE_DISH_MENU_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SIDE_DISH_SECTIONS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return structuredClone(DEFAULT_SIDE_DISH_SECTIONS);
    const cleaned = parsed
      .filter(isValidSection)
      .map((sec) => ({ ...sec, items: (sec.items || []).filter(isValidItem) }));
    return cleaned.length ? enrichSideDishSections(cleaned) : structuredClone(DEFAULT_SIDE_DISH_SECTIONS);
  } catch {
    return structuredClone(DEFAULT_SIDE_DISH_SECTIONS);
  }
}

export function saveSideDishSections(sections) {
  localStorage.setItem(SIDE_DISH_MENU_STORAGE_KEY, JSON.stringify(sections));
}
