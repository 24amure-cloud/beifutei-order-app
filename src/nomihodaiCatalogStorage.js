import { DEFAULT_NOMIHODAI_CATALOG } from './data/defaultNomihodaiCatalog.js';

export const NOMIHODAI_CATALOG_STORAGE_KEY = 'beifutei-nomihodai-catalog-v1';

function isValidItem(it) {
  return it && typeof it.id === 'string' && it.id.length > 0 && typeof it.name === 'string';
}

function isValidSection(s) {
  if (!s || typeof s.id !== 'string' || !s.id) return false;
  if (typeof s.titleJa !== 'string' || typeof s.titleEn !== 'string') return false;
  if (!Array.isArray(s.items)) return false;
  return true;
}

/** localStorage から読込。壊れている場合はデフォルト */
export function loadNomihodaiCatalog() {
  try {
    const raw = localStorage.getItem(NOMIHODAI_CATALOG_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_NOMIHODAI_CATALOG);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return structuredClone(DEFAULT_NOMIHODAI_CATALOG);
    const cleaned = parsed.filter(isValidSection).map((sec) => ({
      ...sec,
      items: sec.items.filter(isValidItem),
    }));
    if (cleaned.length === 0) return structuredClone(DEFAULT_NOMIHODAI_CATALOG);
    return cleaned;
  } catch {
    return structuredClone(DEFAULT_NOMIHODAI_CATALOG);
  }
}

export function saveNomihodaiCatalog(catalog) {
  localStorage.setItem(NOMIHODAI_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
}
