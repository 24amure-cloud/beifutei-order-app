import {
  DEFAULT_NOMIHODAI_CATALOG,
  DEFAULT_NOMIHODAI_CATALOG_VERSION,
  NOMIHODAI_GUEST_SHOTS_TAB_ID,
  NOMIHODAI_GUEST_TAB_ORDER,
  NOMIHODAI_NONALCOHOL_ITEM_IDS,
} from './data/defaultNomihodaiCatalog.js';

export const NOMIHODAI_CATALOG_STORAGE_KEY = 'beifutei-nomihodai-catalog-v1';
export const NOMIHODAI_CATALOG_VERSION_KEY = 'beifutei-nomihodai-catalog-version';

function isValidItem(it) {
  if (!it || typeof it.id !== 'string' || it.id.length === 0 || typeof it.name !== 'string') return false;
  if (it.nameEn != null && typeof it.nameEn !== 'string') return false;
  if (it.price != null && (!Number.isFinite(Number(it.price)) || Number(it.price) < 0)) return false;
  return true;
}

function isValidSection(s) {
  if (!s || typeof s.id !== 'string' || !s.id) return false;
  if (typeof s.titleJa !== 'string' || typeof s.titleEn !== 'string') return false;
  if (!Array.isArray(s.items)) return false;
  return true;
}

/** 2025-05 ラインナップ（7カテゴリ・ノンアル・ソフト統合）と一致するか */
const REQUIRED_SECTION_IDS = [
  'nh-cat-beer',
  'nh-cat-highball',
  'nh-cat-shochu',
  'nh-cat-sour',
  'nh-cat-wine',
  'nh-cat-cocktail',
  'nh-cat-nonalcoholic',
];

const REQUIRED_ITEM_IDS = [
  'nh-beer-glass',
  'nh-sour-mango',
  'nh-ck-cassis-soda',
  'nh-ck-elderflower',
  ...NOMIHODAI_NONALCOHOL_ITEM_IDS,
];

/** 旧データ：スラッシュ区切りで1行にまとめていた品目 */
const LEGACY_COMBINED_ITEM_IDS = new Set([
  'nh-ck-gin-tonic-back',
  'nh-ck-vodka-moscow',
  'nh-ck-rum-ginger',
  'nh-ck-cassis-mix',
  'nh-ck-peach-mix',
  'nh-ck-campari-mix',
  'nh-ck-malibu-mix',
  'nh-ck-passoa-mix',
  'nh-ck-umeshu-mix',
  'nh-na-calpis',
  'nh-soft-cola-ginger',
  'nh-soft-tea',
  'nh-soft-cola',
  'nh-soft-orange',
  'nh-na-apple-soda',
  'nh-na-yuzu-soda',
  'nh-wine-glass-rw',
  'nh-ck-umeshu-water',
]);

const LEGACY_ITEM_NAME_MARKERS = ['（緑ハイ）', '（ジャスハイ）', 'むぎちゃハイ', '（プレーン炭酸水割り）', '梅酒水割り'];

const LEGACY_SECTION_IDS = new Set(['nh-cat-soft']);

function catalogHasCombinedLineItems(catalog) {
  for (const sec of catalog || []) {
    for (const it of sec.items || []) {
      if (LEGACY_COMBINED_ITEM_IDS.has(it.id)) return true;
      if (/[\/／]/.test(String(it.name || ''))) return true;
      const name = String(it.name || '');
      if (LEGACY_ITEM_NAME_MARKERS.some((m) => name.includes(m))) return true;
    }
  }
  return false;
}

function catalogSectionOrderKey(catalog) {
  return (catalog || []).map((s) => s.id).join('|');
}

function catalogNeedsRefresh(catalog) {
  if (!isCurrentNomihodaiCatalog(catalog)) return true;
  const beer = catalog.find((s) => s.id === 'nh-cat-beer');
  const firstBeer = beer?.items?.[0];
  if (firstBeer?.id !== 'nh-beer-glass') return true;
  if (String(firstBeer?.name || '').includes('たっぴー')) return true;
  const expectedOrder = NOMIHODAI_GUEST_TAB_ORDER.filter((id) => id !== NOMIHODAI_GUEST_SHOTS_TAB_ID).join('|');
  if (catalogSectionOrderKey(catalog) !== expectedOrder) return true;
  if (catalogHasCombinedLineItems(catalog)) return true;
  return false;
}

export function isCurrentNomihodaiCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length < REQUIRED_SECTION_IDS.length) return false;
  const sectionIds = new Set(catalog.map((s) => s.id));
  if ([...LEGACY_SECTION_IDS].some((id) => sectionIds.has(id))) return false;
  if (!REQUIRED_SECTION_IDS.every((id) => sectionIds.has(id))) return false;
  const itemIds = new Set(catalog.flatMap((s) => (s.items || []).map((it) => it.id)));
  return REQUIRED_ITEM_IDS.every((id) => itemIds.has(id));
}

function applyDefaultCatalogMigration() {
  const fresh = structuredClone(DEFAULT_NOMIHODAI_CATALOG);
  saveNomihodaiCatalog(fresh);
  localStorage.setItem(NOMIHODAI_CATALOG_VERSION_KEY, String(DEFAULT_NOMIHODAI_CATALOG_VERSION));
  return fresh;
}

/** localStorage から読込。壊れている場合はデフォルト */
export function loadNomihodaiCatalog() {
  try {
    const storedVer = Number(localStorage.getItem(NOMIHODAI_CATALOG_VERSION_KEY) || 0);
    if (storedVer < DEFAULT_NOMIHODAI_CATALOG_VERSION) {
      return applyDefaultCatalogMigration();
    }

    const raw = localStorage.getItem(NOMIHODAI_CATALOG_STORAGE_KEY);
    if (!raw) return applyDefaultCatalogMigration();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return applyDefaultCatalogMigration();
    const cleaned = parsed.filter(isValidSection).map((sec) => ({
      ...sec,
      items: sec.items.filter(isValidItem),
    }));
    if (cleaned.length === 0 || catalogNeedsRefresh(cleaned)) return applyDefaultCatalogMigration();
    return cleaned;
  } catch {
    return applyDefaultCatalogMigration();
  }
}

export function saveNomihodaiCatalog(catalog) {
  localStorage.setItem(NOMIHODAI_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  localStorage.setItem(NOMIHODAI_CATALOG_VERSION_KEY, String(DEFAULT_NOMIHODAI_CATALOG_VERSION));
}
