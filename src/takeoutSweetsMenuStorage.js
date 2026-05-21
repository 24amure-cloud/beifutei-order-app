import { DEFAULT_TAKEOUT_SWEETS_SECTIONS } from './data/defaultTakeoutSweetsMenu.js';

export const TAKEOUT_SWEETS_MENU_STORAGE_KEY = 'beifutei-takeout-sweets-menu-v1';
const KUKKI_COOKIE_IMAGE_FIX_KEY = 'beifutei-takeout-kukki-image-fix-v1';

/** ナッツチョコ→チョコ画像、ハスカップチョコ→画像なし（既存端末の localStorage を1回だけ更新） */
function migrateKukkiCookieImages(sections) {
  if (localStorage.getItem(KUKKI_COOKIE_IMAGE_FIX_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => {
    if (sec.id !== 'ts-sec-kukki') return sec;
    return {
      ...sec,
      items: (sec.items || []).map((it) => {
        if (it.id === 'ts-kk-nuts-choco' && it.image !== 'kukkisanndo-choko.png') {
          changed = true;
          return { ...it, image: 'kukkisanndo-choko.png' };
        }
        if (it.id === 'ts-kk-hasukappu' && it.image) {
          changed = true;
          return { ...it, image: '' };
        }
        return it;
      }),
    };
  });
  localStorage.setItem(KUKKI_COOKIE_IMAGE_FIX_KEY, '1');
  if (changed) saveTakeoutSweetsSections(next);
  return next;
}

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
    const loaded = cleaned.length ? cleaned : structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
    return migrateKukkiCookieImages(loaded);
  } catch {
    return migrateKukkiCookieImages(structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS));
  }
}

export function saveTakeoutSweetsSections(sections) {
  localStorage.setItem(TAKEOUT_SWEETS_MENU_STORAGE_KEY, JSON.stringify(sections));
}

/** 全セクションの品目をフラット配列で */
export function flattenTakeoutSections(sections) {
  return (sections || []).flatMap((sec) => sec.items || []);
}
