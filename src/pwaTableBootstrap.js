import { readGuestTableLabelFromUrl } from './guestOrderUrl.js';
import {
  KITCHEN_FOCUS_TABLE_KEY,
  NOMIHODAI_SESSION_KEY,
  isKitchenAppPage,
  normalizeTableLabelKey,
} from './nomihodaiSession.js';

/** 客席タブレット用：ホーム画面追加後も卓番を復元（localStorage） */
export const GUEST_PWA_TABLE_KEY = 'beifutei-pwa-guest-table-v1';
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

export function persistGuestPwaTable(label) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return;
  try {
    localStorage.setItem(GUEST_PWA_TABLE_KEY, k);
  } catch {
    /* ignore */
  }
}

export function loadGuestPwaTable() {
  try {
    const fromLs = normalizeTableLabelKey(localStorage.getItem(GUEST_PWA_TABLE_KEY) ?? '');
    if (fromLs) return fromLs;
    const fromSs = normalizeTableLabelKey(sessionStorage.getItem(LEGACY_GUEST_PWA_SESSION_KEY) ?? '');
    if (fromSs) {
      persistGuestPwaTable(fromSs);
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

function loadGuestTableFromSessionStorage() {
  try {
    const raw = localStorage.getItem(NOMIHODAI_SESSION_KEY);
    if (!raw) return '';
    const p = JSON.parse(raw);
    return normalizeTableLabelKey(p.tableLabel ?? '');
  } catch {
    return '';
  }
}

function persistPwaTableStorageOnly(label) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return;
  if (isKitchenAppPage()) persistKitchenPwaTable(k);
  else persistGuestPwaTable(k);
}

/**
 * 起動時：URL の ?table= を最優先。無いときだけ端末保存分を URL に復元。
 */
export function bootstrapPwaTableForPage() {
  const fromUrl = readGuestTableLabelFromUrl();
  if (fromUrl) {
    persistPwaTableStorageOnly(fromUrl);
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

  const fromPwa = loadGuestPwaTable();
  if (fromPwa) {
    restoreTableInUrlIfMissing(fromPwa);
    return { tableLabel: fromPwa, source: 'guest-pwa-storage' };
  }

  const fromSession = loadGuestTableFromSessionStorage();
  if (fromSession) {
    persistGuestPwaTable(fromSession);
    restoreTableInUrlIfMissing(fromSession);
    return { tableLabel: fromSession, source: 'guest-session-storage' };
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
  persistPwaTableStorageOnly(fromUrl);
  return fromUrl;
}

/** UI から卓を切り替えたとき：storage と URL の両方を更新 */
export function persistTableLabelFromApp(label) {
  const k = normalizeTableLabelKey(label ?? '');
  if (!k) return;
  persistPwaTableStorageOnly(k);
  syncTableInUrl(k);
}
