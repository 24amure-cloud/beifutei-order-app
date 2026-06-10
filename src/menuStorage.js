import {
  DEFAULT_DRINK_MENU_SECTIONS,
  DEFAULT_DRINK_MENU_VERSION,
} from './data/defaultDrinkMenu.js';
import { drinkCocktailSectionNeedsRefresh } from './drinkCocktailSync.js';

export const DRINK_MENU_STORAGE_KEY = 'beifutei-menu-drink-sections-v1';
export const DRINK_MENU_VERSION_KEY = 'beifutei-menu-drink-version';

const REQUIRED_DRINK_SECTION_IDS = ['whisky', 'beer', 'sake', 'shochu', 'cocktail', 'sour', 'soft', 'spot'];
const REQUIRED_DRINK_ITEM_IDS = [
  'pd-beer-glass',
  'pd-sake-denshu',
  'pd-sp-gin',
  'pd-spot-yamazaki',
  'pd-sour-peach',
  'pd-soft-nabiru',
  'pd-soft-jasmine',
  'pd-soft-mugicha',
];
const LEGACY_DRINK_SECTION_IDS = new Set(['wine', 'spirits']);

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
  if (s.staffOnly != null && typeof s.staffOnly !== 'boolean') return false;
  if (!Array.isArray(s.items)) return false;
  return s.items.every(isValidItem);
}

function isCurrentDrinkMenu(catalog) {
  if (!Array.isArray(catalog) || catalog.length < REQUIRED_DRINK_SECTION_IDS.length) return false;
  const sectionIds = new Set(catalog.map((s) => s.id));
  if ([...LEGACY_DRINK_SECTION_IDS].some((id) => sectionIds.has(id))) return false;
  if (!REQUIRED_DRINK_SECTION_IDS.every((id) => sectionIds.has(id))) return false;
  const itemIds = new Set(catalog.flatMap((s) => (s.items || []).map((it) => it.id)));
  return REQUIRED_DRINK_ITEM_IDS.every((id) => itemIds.has(id));
}

function applyDefaultDrinkMenuMigration() {
  const fresh = structuredClone(DEFAULT_DRINK_MENU_SECTIONS);
  saveDrinkMenuSections(fresh);
  localStorage.setItem(DRINK_MENU_VERSION_KEY, String(DEFAULT_DRINK_MENU_VERSION));
  return fresh;
}

/** localStorage から読込。壊れている場合はデフォルト */
export function loadDrinkMenuSections() {
  try {
    const storedVer = Number(localStorage.getItem(DRINK_MENU_VERSION_KEY) || 0);
    if (storedVer < DEFAULT_DRINK_MENU_VERSION) {
      return applyDefaultDrinkMenuMigration();
    }

    const raw = localStorage.getItem(DRINK_MENU_STORAGE_KEY);
    if (!raw) return applyDefaultDrinkMenuMigration();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return applyDefaultDrinkMenuMigration();
    const cleaned = parsed.filter(isValidSection).map((sec) => ({
      ...sec,
      items: sec.items.filter(isValidItem),
    }));
    if (cleaned.length === 0 || !isCurrentDrinkMenu(cleaned) || drinkCocktailSectionNeedsRefresh(cleaned)) {
      return applyDefaultDrinkMenuMigration();
    }
    return cleaned;
  } catch {
    return applyDefaultDrinkMenuMigration();
  }
}

export function saveDrinkMenuSections(sections) {
  localStorage.setItem(DRINK_MENU_STORAGE_KEY, JSON.stringify(sections));
  localStorage.setItem(DRINK_MENU_VERSION_KEY, String(DEFAULT_DRINK_MENU_VERSION));
}
