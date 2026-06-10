import { DEFAULT_SIDE_DISH_SECTIONS } from './data/defaultSideDishMenu.js';
import { enrichSideDishSections } from './sideDishMenuLabels.js';

export const SIDE_DISH_MENU_STORAGE_KEY = 'beifutei-side-dish-menu-v1';
const SIDE_DISH_CONTENT_FIX_KEY = 'beifutei-sidedish-content-fix-v2';

const SIDE_DISH_ITEM_PATCHES = {
  'sd-jerky': { name: '自家製ジャーキー' },
  'sd-potato': { name: 'ポテト' },
  'sd-hash': { name: 'ハッシュドポテト（5個）', image: '' },
  'sd-nugget': { name: 'チキンナゲット（5個）' },
  'sd-wiener': { name: '赤ウインナー串', image: '' },
  'sd-snack-chashu': { image: '' },
  'sd-pickles': { name: '自家製ピクルス', image: '' },
};

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

function migrateSideDishContent(sections) {
  if (localStorage.getItem(SIDE_DISH_CONTENT_FIX_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => ({
    ...sec,
    items: (sec.items || []).map((it) => {
      const patch = SIDE_DISH_ITEM_PATCHES[it.id];
      if (!patch) return it;
      const merged = { ...it, ...patch };
      if (JSON.stringify(merged) !== JSON.stringify(it)) changed = true;
      return merged;
    }),
  }));
  localStorage.setItem(SIDE_DISH_CONTENT_FIX_KEY, '1');
  if (changed) saveSideDishSections(next);
  return next;
}

export function loadSideDishSections() {
  try {
    const raw = localStorage.getItem(SIDE_DISH_MENU_STORAGE_KEY);
    if (!raw) return migrateSideDishContent(structuredClone(DEFAULT_SIDE_DISH_SECTIONS));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return migrateSideDishContent(structuredClone(DEFAULT_SIDE_DISH_SECTIONS));
    }
    const cleaned = parsed
      .filter(isValidSection)
      .map((sec) => ({ ...sec, items: (sec.items || []).filter(isValidItem) }));
    const loaded = cleaned.length ? enrichSideDishSections(cleaned) : structuredClone(DEFAULT_SIDE_DISH_SECTIONS);
    return migrateSideDishContent(loaded);
  } catch {
    return migrateSideDishContent(structuredClone(DEFAULT_SIDE_DISH_SECTIONS));
  }
}

export function saveSideDishSections(sections) {
  localStorage.setItem(SIDE_DISH_MENU_STORAGE_KEY, JSON.stringify(sections));
}
