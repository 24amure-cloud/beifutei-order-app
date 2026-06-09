import { readGuestTableLabelFromUrl } from './guestOrderUrl.js';
import { isKitchenAppPage, normalizeTableLabelKey } from './nomihodaiSession.js';

/** 客席タブレット用：ホーム画面追加後も卓番を復元（localStorage） */
export const GUEST_PWA_TABLE_KEY = 'beifutei-pwa-guest-table-v1';
/** ?table= 付き URL で一度保存した卓番だけ PWA 起動時に信頼する */
export const GUEST_PWA_TABLE_CONFIRMED_KEY = 'beifutei-pwa-guest-table-from-url-v1';
const LEGACY_GUEST_PWA_SESSION_KEY = 'beifutei-pwa-last-guest-table-v1';

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches === true ||
    window.navigator.standalone === true
  );
}

/** URL に ?table= があるか（空でない） */
export function hasTableInUrl(location) {
  if (typeof window === 'undefined' && !location) return false;
  const search = location?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const tbl = new URLSearchParams(search).get('table');
  return !!(tbl && String(tbl).trim());
}

/** アドレスバーの ?table= を指定卓番に更新（明示的な卓切替用） */
export function syncTableInUrl(tableLabel) {
  const lbl = normalizeTableLabelKey(tableLabel ?? '');
  if (!lbl || typeof window === 'undefined') return false;
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get('table') === lbl) return false;
    u.searchParams.set('table', lbl);
    window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`);
    return true;
  } catch {
    return false;
  }
}

/** URL に卓番が無いときだけ ?table= を復元（保存値で URL を上書きしない） */
export function restoreTableInUrlIfMissing(tableLabel) {
  if (hasTableInUrl()) return false;
  return syncTableInUrl(tableLabel);
}

export function persistGuestPwaTable(label, { confirmed = false } = {}) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return;
  try {
    localStorage.setItem(GUEST_PWA_TABLE_KEY, k);
    if (confirmed) localStorage.setItem(GUEST_PWA_TABLE_CONFIRMED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** バグで誤保存されたデフォルト卓3を PWA 起動時に使わない */
export function isGuestPwaTableTrusted(label) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return false;
  try {
    if (localStorage.getItem(GUEST_PWA_TABLE_CONFIRMED_KEY) === '1') return true;
    return k !== '3';
  } catch {
    return k !== '3';
  }
}

export function loadGuestPwaTable({ trustedOnly = false } = {}) {
  try {
    const fromLs = normalizeTableLabelKey(localStorage.getItem(GUEST_PWA_TABLE_KEY) ?? '');
    if (fromLs) {
      if (!trustedOnly || isGuestPwaTableTrusted(fromLs)) return fromLs;
      return '';
    }
    const fromSs = normalizeTableLabelKey(sessionStorage.getItem(LEGACY_GUEST_PWA_SESSION_KEY) ?? '');
    if (fromSs) {
      persistGuestPwaTable(fromSs, { confirmed: true });
      sessionStorage.removeItem(LEGACY_GUEST_PWA_SESSION_KEY);
      return fromSs;
    }
  } catch {
    /* ignore */
  }
  return '';
}

export function persistKitchenPwaTable(label) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return;
  try {
    localStorage.setItem(
      KITCHEN_FOCUS_TABLE_KEY,
      JSON.stringify({
        tableId: 'default',
        tableLabel: k,
        nomihodaiFarewell: null,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function loadKitchenPwaTable() {
  try {
    const raw = localStorage.getItem(KITCHEN_FOCUS_TABLE_KEY);
    if (!raw) return '';
    const p = JSON.parse(raw);
    return normalizeTableLabelKey(p.tableLabel ?? '');
  } catch {
    return '';
  }
}

function persistPwaTableStorageOnly(label, { confirmed = false } = {}) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return;
  if (isKitchenAppPage()) persistKitchenPwaTable(k);
  else persistGuestPwaTable(k, { confirmed });
}

/**
 * 起動時：URL の ?table= を最優先。無いときだけ端末保存分を URL に復元。
 */
export function bootstrapPwaTableForPage() {
  const fromUrl = readGuestTableLabelFromUrl();
  if (fromUrl) {
    persistPwaTableStorageOnly(fromUrl, { confirmed: true });
    return { tableLabel: fromUrl, source: 'url' };
  }

  if (isKitchenAppPage()) {
    const stored = loadKitchenPwaTable();
    if (stored) {
      restoreTableInUrlIfMissing(stored);
      return { tableLabel: stored, source: 'kitchen-storage' };
    }
    return { tableLabel: '', source: 'none' };
  }

  const fromPwa = loadGuestPwaTable({ trustedOnly: true });
  if (fromPwa) {
    restoreTableInUrlIfMissing(fromPwa);
    return { tableLabel: fromPwa, source: 'guest-pwa-storage' };
  }

  return { tableLabel: '', source: 'none' };
}

/**
 * URL に ?table= があるときは必ずそれを採用し storage に反映する。
 * @returns {string} 採用した卓番（無ければ ''）
 */
export function applyTableLabelFromUrl() {
  const fromUrl = readGuestTableLabelFromUrl();
  if (!fromUrl) return '';
  persistPwaTableStorageOnly(fromUrl, { confirmed: true });
  return fromUrl;
}

/** UI から卓を切り替えたとき：storage と URL の両方を更新 */
export function persistTableLabelFromApp(label) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return;
  persistPwaTableStorageOnly(k, { confirmed: true });
  syncTableInUrl(k);
}
