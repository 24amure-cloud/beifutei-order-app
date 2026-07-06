import {
  KITCHEN_ABURASOBA_TOPPINGS,
  KITCHEN_TAKEOUT_CONTAINER_ITEMS,
} from './data/kitchenRetailTakeoutMenu.js';
import {
  KITCHEN_CAFE_PICK_ITEMS,
  KITCHEN_SOFT_PICK_ITEMS,
  buildKitchenRetailPickSections,
} from './data/kitchenRetailPickCatalog.js';

/** @typedef {{ itemId: string, itemName: string, price: number, kind: 'food'|'drink'|'other', groupId: string, sectionTitle: string, nameEn?: string, forceNh?: boolean }} HandyMenuItem */

export const HANDY_MENU_GROUPS = [
  { id: 'aburasoba', label: '油そば' },
  { id: 'side', label: 'サイド' },
  { id: 'drink', label: 'ドリンク' },
  { id: 'retail', label: 'カフェ・ソフト' },
  { id: 'nomihodai', label: '飲み放題' },
  { id: 'sweets', label: 'スイーツ' },
];

function cleanName(name) {
  return String(name ?? '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMenuItemPrice(raw) {
  if (raw == null || raw === '') return null;
  const p = Number(raw);
  return Number.isFinite(p) && p > 0 ? p : null;
}

function mapSectionItems(section, groupId, kind, mapItem) {
  const title = section.titleJa || section.titleEn || section.id || '';
  const items = [];
  for (const it of section.items || []) {
    const price = parseMenuItemPrice(it.price);
    if (price == null) continue;
    const mapped = mapItem({ ...it, price }, title);
    if (mapped) items.push(mapped);
  }
  return items.length ? { id: `${groupId}-${section.id}`, title, groupId, items } : null;
}

function buildAburasobaSections() {
  const toppingItems = KITCHEN_ABURASOBA_TOPPINGS.map((t) => ({
    itemId: t.id,
    itemName: t.name,
    price: t.price,
    kind: 'food',
    groupId: 'aburasoba',
    sectionTitle: 'トッピング',
  }));
  const containerItems = KITCHEN_TAKEOUT_CONTAINER_ITEMS.map((it) => ({
    itemId: it.id,
    itemName: it.name,
    price: it.price,
    kind: 'other',
    groupId: 'aburasoba',
    sectionTitle: 'お持ち帰り容器',
  }));
  const sections = [{ id: 'abu-tops', title: 'トッピングのみ', groupId: 'aburasoba', items: toppingItems }];
  if (containerItems.length) {
    sections.push({
      id: 'abu-containers',
      title: 'お持ち帰り容器',
      groupId: 'aburasoba',
      items: containerItems,
    });
  }
  return sections;
}

/**
 * @param {{
 *   drinkSections: Array,
 *   sideDishSections: Array,
 *   nomihodaiCatalog: Array,
 *   takeoutSections: Array,
 * }} sources
 */
export function buildHandyMenuCatalog(sources) {
  const sections = [];

  sections.push(...buildAburasobaSections());

  for (const sec of sources.sideDishSections || []) {
    if (sec.layout === 'drinks' || sec.id === 'sd-sec-drinks') continue;
    const mapped = mapSectionItems(sec, 'side', 'food', (it, title) => ({
      itemId: it.id,
      itemName: cleanName(it.name),
      price: it.price,
      kind: 'food',
      groupId: 'side',
      sectionTitle: title,
    }));
    if (mapped) sections.push(mapped);
  }

  for (const sec of sources.drinkSections || []) {
    const mapped = mapSectionItems(sec, 'drink', 'drink', (it, title) => ({
      itemId: it.id,
      itemName: cleanName(it.name),
      price: it.price,
      kind: 'drink',
      groupId: 'drink',
      sectionTitle: title,
      nameEn: it.nameEn,
    }));
    if (mapped) sections.push(mapped);
  }

  for (const sec of sources.nomihodaiCatalog || []) {
    const title = sec.titleJa || sec.titleEn || sec.id || '飲み放題';
    const items = (sec.items || []).map((it) => ({
      itemId: it.id,
      itemName: cleanName(it.name),
      price: 0,
      kind: 'drink',
      groupId: 'nomihodai',
      sectionTitle: title,
      nameEn: it.nameEn,
      forceNh: true,
    }));
    if (items.length) {
      sections.push({ id: `nh-${sec.id}`, title, groupId: 'nomihodai', items });
    }
  }

  for (const sec of sources.takeoutSections || []) {
    const mapped = mapSectionItems(sec, 'sweets', 'food', (it, title) => ({
      itemId: it.id,
      itemName: cleanName(it.name),
      price: it.price,
      kind: 'food',
      groupId: 'sweets',
      sectionTitle: title,
    }));
    if (mapped) sections.push(mapped);
  }

  sections.push(...buildKitchenRetailPickSections());

  const allItems = [
    ...sections.flatMap((s) => s.items),
    ...KITCHEN_CAFE_PICK_ITEMS,
    ...KITCHEN_SOFT_PICK_ITEMS,
  ];
  const deduped = [];
  const seen = new Set();
  for (const item of allItems) {
    if (!item?.itemId || seen.has(item.itemId)) continue;
    seen.add(item.itemId);
    deduped.push(item);
  }
  return { groups: HANDY_MENU_GROUPS, sections, allItems: deduped };
}

function normalizeForSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\n/g, '');
}

function itemHaystack(item) {
  const groupLabel = HANDY_MENU_GROUPS.find((g) => g.id === item.groupId)?.label || '';
  return normalizeForSearch(
    [item.itemName, item.nameEn, item.sectionTitle, groupLabel].filter(Boolean).join(' '),
  );
}

function scoreItem(item, queryNorm) {
  if (!queryNorm) return 0;
  const nameNorm = normalizeForSearch(item.itemName);
  const enNorm = normalizeForSearch(item.nameEn);
  if (nameNorm.startsWith(queryNorm)) return 120;
  if (enNorm && enNorm.startsWith(queryNorm)) return 115;
  if (nameNorm.includes(queryNorm)) return 90;
  if (enNorm && enNorm.includes(queryNorm)) return 85;
  const hay = itemHaystack(item);
  if (hay.includes(queryNorm)) return 70;
  return 0;
}

/**
 * @param {HandyMenuItem[]} items
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export function searchHandyMenuItems(items, query, opts = {}) {
  const q = String(query ?? '').trim();
  if (!q) return [];
  const qNorm = normalizeForSearch(q);
  if (!qNorm) return [];
  const limit = opts.limit ?? 40;
  return items
    .map((item) => ({ item, score: scoreItem(item, qNorm) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.itemName.localeCompare(b.item.itemName, 'ja'))
    .slice(0, limit)
    .map((x) => x.item);
}

/**
 * @param {ReturnType<typeof buildHandyMenuCatalog>['sections']} sections
 * @param {string} groupId
 */
export function getHandySectionsForGroup(sections, groupId) {
  return sections.filter((s) => s.groupId === groupId);
}

export function handyGroupLabel(groupId) {
  return HANDY_MENU_GROUPS.find((g) => g.id === groupId)?.label || groupId;
}

/** ハンディ「クイック」に並べる直近品目の最大件数 */
export const HANDY_RECENT_MAX = 16;

const HANDY_RECENT_STORAGE_KEY = 'beifutei-handy-recent-v2';
const HANDY_RECENT_STORAGE_KEY_V1 = 'beifutei-handy-recent-v1';

function normalizeRecentPick(pick) {
  if (!pick?.itemId || !pick?.itemName) return null;
  return {
    itemId: String(pick.itemId),
    itemName: String(pick.itemName),
    price: Math.max(0, Number(pick.price) || 0),
    kind: pick.kind || 'other',
    groupId: pick.groupId || 'other',
    sectionTitle: pick.sectionTitle || '',
    nameEn: pick.nameEn,
    forceNh: !!pick.forceNh,
    soldOut: !!pick.soldOut,
  };
}

function loadHandyRecentItemIdsV1() {
  try {
    const raw = localStorage.getItem(HANDY_RECENT_STORAGE_KEY_V1);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, HANDY_RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/**
 * @param {HandyMenuItem[]} [allItems]
 */
export function loadHandyRecentPicks(allItems = []) {
  try {
    const raw = localStorage.getItem(HANDY_RECENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeRecentPick).filter(Boolean).slice(0, HANDY_RECENT_MAX);
      }
    }
  } catch {
    /* ignore */
  }

  const byId = new Map((allItems || []).map((it) => [it.itemId, it]));
  return loadHandyRecentItemIdsV1()
    .map((id) => byId.get(id))
    .map(normalizeRecentPick)
    .filter(Boolean)
    .slice(0, HANDY_RECENT_MAX);
}

/** @param {object} pick */
export function pushHandyRecentPick(pick) {
  const snapshot = normalizeRecentPick(pick);
  if (!snapshot) return;
  if (snapshot.itemId.includes('-solo')) return;
  try {
    const prev = loadHandyRecentPicks();
    const next = [snapshot, ...prev.filter((x) => x.itemId !== snapshot.itemId)].slice(0, HANDY_RECENT_MAX);
    localStorage.setItem(HANDY_RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * @param {HandyMenuItem[]} _allItems
 * @param {HandyMenuItem[]} [recentPicks]
 */
export function buildHandyQuickItems(_allItems, recentPicks = []) {
  return (recentPicks || []).filter(Boolean).slice(0, HANDY_RECENT_MAX);
}

export function resolveHandyPickKey(pick, nhActive, nhPlanDrinks) {
  const isDrink = pick.kind === 'drink';
  const nhPlanFree = !!pick.forceNh || (nhActive && nhPlanDrinks && isDrink);
  return `${pick.itemId}:${nhPlanFree ? 'nh' : 'std'}`;
}
