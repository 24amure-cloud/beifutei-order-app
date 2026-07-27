/**
 * 日計伝票行の itemId / 品名から、オーナー向けカテゴリを判定する。
 * （カフェ: cafe-* / ソフト: fr-* / テイクアウトスイーツ: ts-* / 油そば: abu:*・to-*・top-* 等）
 */

import { DEFAULT_DRINK_MENU_SECTIONS } from './data/defaultDrinkMenu.js';
import { DEFAULT_SIDE_DISH_SECTIONS } from './data/defaultSideDishMenu.js';
import { DEFAULT_TAKEOUT_SWEETS_SECTIONS } from './data/defaultTakeoutSweetsMenu.js';
import { KITCHEN_CAFE_PICK_ITEMS, KITCHEN_SOFT_PICK_ITEMS } from './data/kitchenRetailPickCatalog.js';
import {
  KITCHEN_ABURASOBA_TAKEOUT,
  KITCHEN_ABURASOBA_TOPPINGS,
  KITCHEN_TAKEOUT_CONTAINER_ITEMS,
} from './data/kitchenRetailTakeoutMenu.js';
import { HANDY_ABU_SIZES } from './handyAburasoba.js';

/** @typedef {'cafe_drink'|'softcream_fruit'|'takeout_sweets'|'aburasoba_takeout'} LedgerCategoryBucket */

/** @typedef {LedgerCategoryBucket|'nomihodai_plan'|'alcohol_charge'|'side'|'drink'|'pizza'|'other'|'card_surcharge'} MenuLedgerBucket */

export const LEDGER_CATEGORY_BUCKETS = [
  'softcream_fruit',
  'cafe_drink',
  'takeout_sweets',
  'aburasoba_takeout',
];

/** 総売上100%分解用（メニュー分類＋会計調整） */
export const MENU_BUCKET_KEYS = [
  'nomihodai_plan',
  'alcohol_charge',
  'aburasoba_takeout',
  'softcream_fruit',
  'cafe_drink',
  'takeout_sweets',
  'side',
  'drink',
  'pizza',
  'other',
  'card_surcharge',
];

export const MENU_BUCKET_LABELS = {
  nomihodai_plan: '飲み放題プラン',
  alcohol_charge: 'チャージ料',
  aburasoba_takeout: '油そば',
  softcream_fruit: 'ソフトクリーム',
  cafe_drink: 'カフェドリンク',
  takeout_sweets: 'テイクアウトスイーツ',
  side: 'サイド',
  drink: 'ドリンク',
  pizza: 'ピッツァ',
  other: 'その他',
  card_surcharge: 'カード5%手数料',
};

function normalizeLineName(name) {
  return String(name ?? '')
    .split('×')[0]
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNameToBucketMap() {
  /** @type {Map<string, LedgerCategoryBucket>} */
  const map = new Map();

  for (const sec of DEFAULT_TAKEOUT_SWEETS_SECTIONS) {
    for (const it of sec.items || []) {
      const n = normalizeLineName(it.name);
      if (n) map.set(n, 'takeout_sweets');
    }
  }

  for (const it of KITCHEN_CAFE_PICK_ITEMS) {
    const n = normalizeLineName(it.itemName);
    if (n) map.set(n, 'cafe_drink');
  }

  for (const it of KITCHEN_SOFT_PICK_ITEMS) {
    const n = normalizeLineName(it.itemName);
    if (n) map.set(n, 'softcream_fruit');
  }

  // 手打ち・伝票略称（ソフトクリーム）
  for (const alias of ['カップ', 'コーン']) {
    map.set(alias, 'softcream_fruit');
  }
  for (const sz of ['ミニ', 'レギュラー']) {
    for (const p of ['（', '(']) {
      const q = p === '（' ? '）' : ')';
      map.set(normalizeLineName(`本日のソフトクリーム${p}${sz}${q}`), 'softcream_fruit');
    }
  }
  for (const t of ['カップ', 'コーン']) {
    for (const p of ['（', '(']) {
      const q = p === '（' ? '）' : ')';
      map.set(normalizeLineName(`ジェラ生ソフト${p}${t}${q}`), 'softcream_fruit');
    }
  }

  // 手打ち・伝票略称（テイクアウトスイーツ）
  for (const alias of ['メロンサンド', '生スコーン', '生クリームスコーン']) {
    map.set(alias, 'takeout_sweets');
  }

  return map;
}

const NAME_TO_BUCKET = buildNameToBucketMap();

function buildSideNameSet() {
  /** @type {Set<string>} */
  const set = new Set();
  for (const sec of DEFAULT_SIDE_DISH_SECTIONS) {
    for (const it of sec.items || []) {
      const n = normalizeLineName(it.name);
      if (n) set.add(n);
    }
  }
  return set;
}

function buildDrinkNameSet() {
  /** @type {Set<string>} */
  const set = new Set();
  for (const sec of DEFAULT_DRINK_MENU_SECTIONS) {
    for (const it of sec.items || []) {
      const n = normalizeLineName(it.name);
      if (n) set.add(n);
    }
  }
  return set;
}

const SIDE_NAME_SET = buildSideNameSet();
const DRINK_NAME_SET = buildDrinkNameSet();

/** 油そばメニュー品名（店内・お持ち帰り・トッピング単品） */
function buildAburasobaNameSet() {
  /** @type {Set<string>} */
  const set = new Set();
  for (const bowl of KITCHEN_ABURASOBA_TAKEOUT) {
    const base = normalizeLineName(bowl.name);
    if (base) set.add(base);
    for (const sz of HANDY_ABU_SIZES) {
      set.add(normalizeLineName(`${bowl.name}（${sz}）`));
    }
  }
  for (const t of KITCHEN_ABURASOBA_TOPPINGS) {
    const n = normalizeLineName(t.name);
    if (n) set.add(n);
  }
  for (const c of KITCHEN_TAKEOUT_CONTAINER_ITEMS) {
    const n = normalizeLineName(c.name);
    if (n) set.add(n);
  }
  return set;
}

const ABURASOBA_NAME_SET = buildAburasobaNameSet();

/** @param {string} id */
export function isAburasobaLedgerItemId(id) {
  const s = String(id ?? '').trim();
  if (!s) return false;
  if (s.startsWith('abu:')) return true;
  if (s.startsWith('staff-abu-')) return true;
  if (s.startsWith('to-')) return true;
  if (/^top-(chashu|spicy|menma|nori|egg|garlic|mayo|cheese)/i.test(s)) return true;
  return false;
}

/** @param {string} name */
export function isAburasobaLedgerName(name) {
  const n = normalizeLineName(name);
  if (!n) return false;
  if (ABURASOBA_NAME_SET.has(n)) return true;
  return /油そば|米風亭|辛々|担々|ネギ盛り|お持ち帰り容器/.test(n);
}

/** 手打ち伝票向け：カップ／コーン単体はソフト容器（ハスカップ等は除外） */
export function isSoftcreamLedgerName(name) {
  const n = normalizeLineName(name);
  if (!n) return false;
  if (NAME_TO_BUCKET.get(n) === 'softcream_fruit') return true;
  if (/^(カップ|コーン)(\s*[￥¥]?\d*)?$/.test(n)) return true;
  if (/ソフトクリーム|ジェラ生ソフト|アフォガード|本日のソフト/.test(n)) return true;
  if (/[（(](カップ|コーン)[）)]/.test(n) && /ソフト|ジェラ|本日/.test(n)) return true;
  if (/^(ジェラ|ソフト)[\s　]*(カップ|コーン)/.test(n)) return true;
  return false;
}

/** 手打ち伝票向け：スコーン・サンド類（生スコーン＝生クリームスコーン略） */
export function isTakeoutSweetsLedgerName(name) {
  const n = normalizeLineName(name);
  if (!n) return false;
  if (NAME_TO_BUCKET.get(n) === 'takeout_sweets') return true;
  if (/メロンサンド|生スコーン|生クリームスコーン/.test(n)) return true;
  if (/クッキーサンド|フルーツサンド|リッチレア|訳アリ/.test(n)) return true;
  if (/スコーン/.test(n)) return true;
  if (/ハニーポッド|ハスカップ|ロイヤルバニラ|ストロベリー|発酵バター|ココアスコーン|抹茶スコーン|キャラメルスコーン|メープルスコーン/.test(n)) return true;
  if (/いちご|キウイ|オレンジ|パイン|バナナ|ゴールデン|フルーツミックス|苫小牧/.test(n)) return true;
  return false;
}

/**
 * @param {unknown} itemId
 * @returns {LedgerCategoryBucket|null}
 */
export function classifyLedgerLineItemId(itemId) {
  const id = String(itemId ?? '').trim();
  if (!id) return null;
  if (id.startsWith('ts-')) return 'takeout_sweets';
  if (id.startsWith('cafe-')) return 'cafe_drink';
  if (id.startsWith('fr-')) return 'softcream_fruit';
  if (isAburasobaLedgerItemId(id)) return 'aburasoba_takeout';
  return null;
}

/**
 * @param {unknown} name
 * @returns {LedgerCategoryBucket|null}
 */
export function classifyLedgerLineByName(name) {
  const n = normalizeLineName(name);
  if (!n) return null;

  const exact = NAME_TO_BUCKET.get(n);
  if (exact) return exact;

  if (isAburasobaLedgerName(n)) {
    return 'aburasoba_takeout';
  }
  if (isSoftcreamLedgerName(n)) {
    return 'softcream_fruit';
  }
  if (/カフェラテ|コーヒー（|コーヒー\(|生いちごミルク|ラテチョコラータ/.test(n)) {
    return 'cafe_drink';
  }
  if (isTakeoutSweetsLedgerName(n)) {
    return 'takeout_sweets';
  }

  return null;
}

/**
 * @param {{ kind?: string, name?: string, itemId?: string }|null|undefined} line
 * @returns {LedgerCategoryBucket|null}
 */
export function classifyLedgerLine(line) {
  if (!line || line.kind !== 'normal') return null;
  return classifyLedgerLineItemId(line.itemId) ?? classifyLedgerLineByName(line.name);
}

function classifyRetailAndAburasoba(line) {
  const byId = classifyLedgerLineItemId(line?.itemId);
  if (byId) return byId;
  return classifyLedgerLineByName(line?.name);
}

function isPizzaLedgerName(name) {
  const n = normalizeLineName(name);
  if (!n) return false;
  return /ピッツァ|ピザ|マルゲリタ|ジェノヴェーゼ|ビスマルク|クワトロフォルマッジ|クワトロ/i.test(n);
}

function isSideLedgerName(name) {
  const n = normalizeLineName(name);
  if (!n) return false;
  if (SIDE_NAME_SET.has(n)) return true;
  return /フランク|ピクルス|枝豆|ウインナー|ポテト|ナゲット|ハッシュ|ジャーキー|からあげ|おつまみチャーシュー/.test(n);
}

function isBarDrinkLedgerName(name) {
  const n = normalizeLineName(name);
  if (!n) return false;
  if (DRINK_NAME_SET.has(n)) return true;
  if (/スタッフドリンク/.test(n)) return true;
  return /ハイボール|ビール|焼酎|サワー|カクテル|ウイスキー|日本酒|梅酒|チューハイ|ノンアルビール|ソーダ|コーラ|ジンジャー|ウーロン|緑茶|ジャスミン|麦茶|カルピス/.test(
    n,
  );
}

/**
 * 明細1行をメニュー分類へ（nh_extra も品目ベースで振り分け）
 * @param {{ kind?: string, name?: string, itemId?: string }|null|undefined} line
 * @returns {MenuLedgerBucket|null}
 */
export function classifyLedgerMenuBucket(line) {
  if (!line) return 'other';
  if (line.kind === 'nh') return null;

  if (line.kind === 'alcohol_charge') return 'alcohol_charge';

  if (line.kind === 'normal' || line.kind === 'nh_extra') {
    const id = String(line.itemId ?? '').trim();
    if (id.startsWith('ledger-charge')) return 'alcohol_charge';

    const retail = classifyRetailAndAburasoba(line);
    if (retail) return retail;

    if (id.startsWith('pz-')) return 'pizza';
    if (/^sd-drink-/i.test(id) || id.startsWith('pd-') || id.startsWith('nh-') || id.startsWith('nm-shot')) {
      return 'drink';
    }
    if (id.startsWith('sd-')) return 'side';

    const n = normalizeLineName(line.name);
    if (/チャージ料/.test(n)) return 'alcohol_charge';
    if (isPizzaLedgerName(n)) return 'pizza';
    if (isSideLedgerName(n)) return 'side';
    if (isBarDrinkLedgerName(n)) return 'drink';

    return 'other';
  }

  return 'other';
}

function pushMenuBucketLine(bucket, line, price, dateKey = '') {
  const name = typeof line.name === 'string' ? line.name.split('\n')[0].trim().slice(0, 80) : '';
  const itemId = String(line.itemId ?? '');
  bucket.revenue += price;
  bucket.lineCount += 1;
  bucket.lines.push({
    name: name || itemId || '（品目）',
    price,
    itemId,
    dateKey: String(dateKey || ''),
  });
}

function pushSyntheticBucketLine(bucket, name, price, dateKey = '') {
  const yen = Math.max(0, Number(price) || 0);
  if (yen <= 0) return;
  bucket.revenue += yen;
  bucket.lineCount += 1;
  bucket.lines.push({
    name: String(name || '（品目）'),
    price: yen,
    itemId: '',
    dateKey: String(dateKey || ''),
  });
}

const EMPTY = () => ({ revenue: 0, lineCount: 0, lines: [] });

/**
 * 指定日の会計エントリから、ソフト／カフェ／テイクアウト／油そばの売上を抜き出す。
 * @param {object[]} dayEntries
 */
export function summarizeLedgerCategoryBuckets(dayEntries) {
  /** @type {Record<LedgerCategoryBucket, { revenue: number, lineCount: number, lines: { name: string, price: number, itemId: string, dateKey?: string }[] }>} */
  const out = {
    cafe_drink: EMPTY(),
    softcream_fruit: EMPTY(),
    takeout_sweets: EMPTY(),
    aburasoba_takeout: EMPTY(),
  };

  for (const e of dayEntries) {
    const lines = Array.isArray(e.lines) ? e.lines : [];
    const dateKey = String(e.dateKey || '');
    for (const ln of lines) {
      if (!ln || ln.kind !== 'normal') continue;
      const price = Math.max(0, Number(ln.price) || 0);
      if (price <= 0) continue;
      const cat = classifyLedgerLine(ln);
      if (!cat) continue;
      const name = typeof ln.name === 'string' ? ln.name.split('\n')[0].trim().slice(0, 80) : '';
      const itemId = String(ln.itemId ?? '');
      out[cat].revenue += price;
      out[cat].lineCount += 1;
      out[cat].lines.push({ name: name || itemId || '（品目）', price, itemId, dateKey });
    }
  }

  for (const b of Object.values(out)) {
    b.lines.sort((a, c) => c.price - a.price);
  }
  return out;
}

/**
 * 会計エントリ全体をメニュー分類で分解（総売上と一致させる）
 * @param {object[]} entries
 */
export function summarizeLedgerMenuBuckets(entries) {
  /** @type {Record<MenuLedgerBucket, { revenue: number, lineCount: number, lines: { name: string, price: number, itemId: string, dateKey?: string }[] }>} */
  const out = Object.fromEntries(MENU_BUCKET_KEYS.map((k) => [k, EMPTY()]));

  let grandTotal = 0;

  for (const e of entries) {
    const entryTotal = Math.max(0, Number(e.total) || 0);
    grandTotal += entryTotal;
    let entryAllocated = 0;
    const dateKey = String(e.dateKey || '');

    const nhPlan = Math.max(0, Number(e.nomihodaiPlanYen) || 0);
    if (nhPlan > 0) {
      pushSyntheticBucketLine(out.nomihodai_plan, '飲み放題プラン', nhPlan, dateKey);
      entryAllocated += nhPlan;
    }

    const alcoholEntry = Math.max(0, Number(e.alcoholChargeYen) || 0);
    let alcoholLineSum = 0;
    let menuLineSum = 0;

    const lines = Array.isArray(e.lines) ? e.lines : [];
    for (const ln of lines) {
      if (!ln || ln.kind === 'nh') continue;

      if (ln.kind === 'alcohol_charge') {
        alcoholLineSum += Math.max(0, Number(ln.price) || 0);
        continue;
      }

      const price = Math.max(0, Number(ln.price) || 0);
      if (price <= 0) continue;

      const bucket = classifyLedgerMenuBucket(ln);
      if (!bucket || bucket === 'alcohol_charge') continue;

      pushMenuBucketLine(out[bucket], ln, price, dateKey);
      menuLineSum += price;
    }

    const alcoholYen = alcoholEntry > 0 ? alcoholEntry : alcoholLineSum;
    if (alcoholYen > 0) {
      pushSyntheticBucketLine(out.alcohol_charge, 'チャージ料', alcoholYen, dateKey);
      entryAllocated += alcoholYen;
    }
    entryAllocated += menuLineSum;

    const remainder = entryTotal - entryAllocated;
    if (remainder > 0) {
      const bucket = e.payment === 'card_5pct' ? 'card_surcharge' : 'other';
      const label = bucket === 'card_surcharge' ? 'カード5%手数料' : 'その他（端数・調整）';
      pushSyntheticBucketLine(out[bucket], label, remainder, dateKey);
    } else if (remainder < 0) {
      out.other.revenue = Math.max(0, out.other.revenue + remainder);
    }
  }

  for (const b of Object.values(out)) {
    b.lines.sort((a, c) => {
      const byDate = String(a.dateKey || '').localeCompare(String(c.dateKey || ''));
      if (byDate !== 0) return byDate;
      return c.price - a.price;
    });
  }

  const bucketGrand = MENU_BUCKET_KEYS.reduce((s, k) => s + out[k].revenue, 0);
  return { buckets: out, grandTotal, bucketGrand };
}
