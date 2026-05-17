/**
 * テイクアウトスイーツ在庫（マスタ連携）
 *
 * 連携手順の例:
 * 1. マスタ／POS API から { [商品ID]: 在庫数 } を取得
 * 2. mergeInventoryMap(remote) でローカルマスタとマージ（リモート優先）
 * 3. enrichItem で各メニュー行に stock を付与し sortTakeoutItemsByStock で並べ替え
 *
 * 注文確定時は applyTakeoutSweetsSales で販売累計を localStorage に加算し、
 * inventoryMapAfterSales を経由した表示在庫から差し引きます（客席・厨房で共有）。
 *
 * 環境変数 VITE_SWEETS_INVENTORY_URL に JSON の URL を置くと、アプリ起動時に GET して反映します。
 * （CORS と公開エンドポイントが必要）
 */

/** アプリ内フォールバック（オフライン／API失敗時）。空なら enrich で defaultStock を使用 */
export const SWEETS_INVENTORY_MASTER = {
  'ts-fr-itigo': 24,
  'ts-fr-furu-tumix': 18,
  'ts-fr-golden-pine': 10,
  'ts-fr-itigokiui': 6,
  'ts-fr-itigopain': 0,
  'ts-fr-ichigobanana': 14,
  'ts-fr-chocobanana': 20,
  'ts-fr-orange': 8,
  'ts-fr-kiui-mix': 16,
  'ts-kk-hani': 22,
  'ts-kk-matcha': 5,
  'ts-kk-hasukappu': 40,
  'ts-kk-nuts-choco': 0,
  'ts-kk-pine': 12,
  'ts-kk-peach': 9,
  'ts-kk-vanilla': 7,
  'ts-kk-straw': 15,
  'ts-sc-plain': 30,
  'ts-sc-choco': 25,
  'ts-sc-matcha': 11,
  'ts-sc-caramel': 8,
  'ts-sc-maple': 13,
  'ts-sc-namacream': 10,
  'ts-rt-1': 50,
  'ts-rt-4': 12,
};

/**
 * @param {Record<string, number>} remote - API 等から取得した id→在庫（0 以上の整数想定）
 */
export function mergeInventoryMap(remote = {}) {
  let base = { ...SWEETS_INVENTORY_MASTER };
  try {
    const raw = localStorage.getItem('beifutei-takeout-sweets-inventory-v1');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        for (const [k, v] of Object.entries(p)) {
          const id = String(k);
          if (!id.startsWith('ts-')) continue;
          base[id] = Math.max(0, Math.floor(Number(v) || 0));
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { ...base, ...remote };
}

/** 同一オリジン内で販売済み数量を累計（ts-* のみ） */
export const SWEETS_SOLD_COUNTS_STORAGE_KEY = 'beifutei-sweets-sold-counts-v1';

function broadcastSweetsSoldUpdated() {
  try {
    window.dispatchEvent(new CustomEvent('beifutei-sweets-sold-updated'));
  } catch {
    /* ignore */
  }
}

export function loadSweetsSoldCounts() {
  try {
    const raw = localStorage.getItem(SWEETS_SOLD_COUNTS_STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object' || Array.isArray(p)) return {};
    const out = {};
    for (const [k, v] of Object.entries(p)) {
      const id = String(k);
      if (!id.startsWith('ts-')) continue;
      const n = Math.max(0, Math.floor(Number(v)) || 0);
      if (n > 0) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function saveSweetsSoldCounts(counts) {
  localStorage.setItem(SWEETS_SOLD_COUNTS_STORAGE_KEY, JSON.stringify(counts));
  broadcastSweetsSoldUpdated();
}

/** 在庫表示に使う merge 済みマップの直近スナップショット（在庫不足判定用） */
let takeoutInventorySnapshot = mergeInventoryMap();

export function syncTakeoutInventoryDisplaySnapshot(map) {
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    takeoutInventorySnapshot = { ...map };
  }
}

export function getTakeoutInventoryDisplaySnapshot() {
  return takeoutInventorySnapshot;
}

/**
 * 販売累計を差し引いた在庫マップ（表示用）。baseMap は mergeInventoryMap 済み想定。
 * @param {Record<string, number>} baseMap
 * @param {Record<string, number>} [soldCounts] 省略時は localStorage
 */
export function inventoryMapAfterSales(baseMap, soldCounts) {
  const sold = soldCounts === undefined ? loadSweetsSoldCounts() : soldCounts || {};
  const out = { ...baseMap };
  for (const [id, s0] of Object.entries(sold)) {
    if (!String(id).startsWith('ts-')) continue;
    const s = Math.max(0, Math.floor(Number(s0)) || 0);
    if (s <= 0) continue;
    const cur = out[id];
    const base =
      typeof cur === 'number' && Number.isFinite(cur) && cur >= 0 ? Math.floor(cur) : 999;
    out[id] = Math.max(0, base - s);
  }
  return out;
}

/**
 * 注文確定後に呼ぶ。id が ts-* の行だけ販売数を加算する。
 * @param {Array<{ id: string, qty?: number }>} items
 */
export function applyTakeoutSweetsSales(items) {
  if (!items?.length) return;
  const sold = loadSweetsSoldCounts();
  let changed = false;
  for (const it of items) {
    const id = String(it?.id || '');
    if (!id.startsWith('ts-')) continue;
    changed = true;
    const q = Math.max(1, Math.floor(Number(it.qty) || 1));
    sold[id] = (sold[id] || 0) + q;
  }
  if (!changed) return;
  saveSweetsSoldCounts(sold);
}

/**
 * @param {Array<{ id: string, qty?: number }>} orderableItems
 * @returns {{ ok: true } | { ok: false, id: string, need: number, have: number }}
 */
export function assertTakeoutSweetsOrderItems(orderableItems) {
  const base = getTakeoutInventoryDisplaySnapshot();
  const eff = inventoryMapAfterSales(base);
  for (const item of orderableItems || []) {
    const id = String(item?.id || '');
    if (!id.startsWith('ts-')) continue;
    const want = Math.max(1, Math.floor(Number(item.qty) || 0));
    if (want <= 0) continue;
    const rem =
      typeof eff[id] === 'number' && Number.isFinite(eff[id]) ? Math.floor(eff[id]) : 999;
    if (want > rem) return { ok: false, id, need: want, have: rem };
  }
  return { ok: true };
}

/**
 * 厨房テイクアウトカート用
 * @param {Array<{ id: string, qty?: number }>} cart
 */
export function assertTakeoutSweetsCart(cart) {
  const rows = (cart || []).filter((r) => String(r?.id || '').startsWith('ts-'));
  return assertTakeoutSweetsOrderItems(rows);
}

/**
 * @param {object} item - メニュー行（id 必須）
 * @param {Record<string, number>} inventoryMap
 * @param {number} defaultStock - マスタに無い ID は「未設定＝十分ある」として大きめの値
 */
export function enrichTakeoutItem(item, inventoryMap, defaultStock = 999) {
  const v = inventoryMap[item.id];
  const stock = typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : defaultStock;
  return { ...item, stock };
}

/**
 * 在庫の多い順。在庫 0（品切れ）は常に末尾。
 * 同数のときは rank（あれば）が小さい順、その次は id。
 */
export function sortTakeoutItemsByStock(items) {
  return [...items].sort((a, b) => {
    const sa = a.stock ?? 0;
    const sb = b.stock ?? 0;
    const aSold = sa <= 0;
    const bSold = sb <= 0;
    if (aSold !== bSold) return aSold ? 1 : -1;
    if (sa !== sb) return sb - sa;
    const ra = typeof a.rank === 'number' ? a.rank : 999;
    const rb = typeof b.rank === 'number' ? b.rank : 999;
    if (ra !== rb) return ra - rb;
    return String(a.id).localeCompare(String(b.id));
  });
}

/** VITE_SWEETS_INVENTORY_URL があれば取得（JSON は { "ts-fr-itigo": 12, ... } 形式） */
export async function fetchSweetsInventoryFromEnv() {
  const url = import.meta.env?.VITE_SWEETS_INVENTORY_URL;
  if (!url || typeof fetch !== 'function') return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    return null;
  } catch {
    return null;
  }
}
