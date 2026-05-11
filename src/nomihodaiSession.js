/**
 * 客タブレット・厨房間の共有セッション。
 * - 注文・卓状態・飲み放題・会計フロー: Supabase Realtime（オリジンをまたいで同期）
 * - 卓番・端末ローカル: localStorage + BroadcastChannel（同一オリジン内のタブ同士）
 */

import { NOMIHODAI_LO_BEFORE_END_MS } from './nomihodaiConstants.js';

export const NOMIHODAI_SESSION_KEY = 'beifutei-table-session-v1';
export const NOMIHODAI_CHANNEL_NAME = 'beifutei-nomihodai-sync';

/** 厨房卓メモ（氏名など）の最大文字数 */
export const TABLE_MEMO_MAX_LEN = 40;

const DEFAULT_SESSION = () => ({
  tableId: 'default',
  tableLabel: '3',
  /** 卓ごとの飲み放題状態（複数卓を同時運用可能） */
  nomihodaiByLabel: {},
  /** 卓ごとの「飲み放題希望」（複数卓から同時に届く） */
  nomihodaiGuestIntentByLabel: {},
  /** 卓番キー → 厨房向けメモ（同一ストレージでタブ間同期） */
  tableMemoByLabel: {},
  nomihodaiFarewell: null,
  checkoutRequestAt: null,
  orders: [],
  updatedAt: Date.now(),
});

let bc = null;
function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!bc) bc = new BroadcastChannel(NOMIHODAI_CHANNEL_NAME);
  return bc;
}

export function broadcastSession() {
  getChannel()?.postMessage({ type: 'session-updated', t: Date.now() });
}

export function normalizeTableMemos(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'string') continue;
    const t = v.replace(/\s+/g, ' ').trim().slice(0, TABLE_MEMO_MAX_LEN);
    if (t) out[String(k)] = t;
  }
  return out;
}

function migrateSessionPayload(p) {
  const nomihodaiByLabel = {};
  if (p.nomihodaiByLabel && typeof p.nomihodaiByLabel === 'object') {
    for (const [k, v] of Object.entries(p.nomihodaiByLabel)) {
      if (!v || typeof v !== 'object') continue;
      const n = normalizeNomihodai(v);
      if (n) nomihodaiByLabel[String(k)] = { ...v, active: true };
    }
  }
  if (Object.keys(nomihodaiByLabel).length === 0 && p.nomihodai && typeof p.nomihodai === 'object') {
    const n = normalizeNomihodai(p.nomihodai);
    if (n) {
      const lbl = typeof p.tableLabel === 'string' ? p.tableLabel : '3';
      nomihodaiByLabel[lbl] = { ...p.nomihodai, active: true };
    }
  }

  const nomihodaiGuestIntentByLabel = {};
  if (p.nomihodaiGuestIntentByLabel && typeof p.nomihodaiGuestIntentByLabel === 'object') {
    for (const [k, v] of Object.entries(p.nomihodaiGuestIntentByLabel)) {
      const ra = Number(v?.requestedAt);
      if (Number.isFinite(ra) && ra > 0) {
        nomihodaiGuestIntentByLabel[String(k)] = { requestedAt: ra };
      }
    }
  }
  if (Object.keys(nomihodaiGuestIntentByLabel).length === 0 && p.nomihodaiGuestIntent) {
    const gi = normalizeGuestIntent(p.nomihodaiGuestIntent);
    if (gi) {
      const lbl =
        (typeof gi.tableLabel === 'string' && gi.tableLabel.trim()) ||
        (typeof p.tableLabel === 'string' ? p.tableLabel : '3');
      nomihodaiGuestIntentByLabel[String(lbl)] = { requestedAt: gi.requestedAt };
    }
  }

  return { nomihodaiByLabel, nomihodaiGuestIntentByLabel };
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(NOMIHODAI_SESSION_KEY);
    if (!raw) return DEFAULT_SESSION();
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return DEFAULT_SESSION();
    const migrated = migrateSessionPayload(p);
    return {
      tableId: typeof p.tableId === 'string' ? p.tableId : 'default',
      tableLabel: typeof p.tableLabel === 'string' ? p.tableLabel : '3',
      nomihodaiByLabel: migrated.nomihodaiByLabel,
      nomihodaiGuestIntentByLabel: migrated.nomihodaiGuestIntentByLabel,
      tableMemoByLabel: normalizeTableMemos(p.tableMemoByLabel),
      nomihodaiFarewell: normalizeFarewell(p.nomihodaiFarewell),
      checkoutRequestAt: normalizeCheckoutRequestAt(p.checkoutRequestAt),
      orders: Array.isArray(p.orders) ? p.orders.filter(isValidOrder) : [],
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
    };
  } catch {
    return DEFAULT_SESSION();
  }
}

/** 指定卓の飲み放題（正規化済み・無ければ null） */
export function getNomihodaiForTable(session, tableLabel) {
  const lbl = String(tableLabel ?? '3');
  const raw = session.nomihodaiByLabel?.[lbl];
  return normalizeNomihodai(raw);
}

/** アクティブな飲み放題が付いている卓の数 */
export function countActiveNomihodaiTables(session) {
  const map = session.nomihodaiByLabel;
  if (!map || typeof map !== 'object') return 0;
  let c = 0;
  for (const v of Object.values(map)) {
    if (normalizeNomihodai(v)) c += 1;
  }
  return c;
}

export function getGuestIntentForTable(session, tableLabel) {
  const lbl = String(tableLabel ?? '3');
  return session.nomihodaiGuestIntentByLabel?.[lbl] ?? null;
}

export function hasAnyGuestIntent(session) {
  const by = session.nomihodaiGuestIntentByLabel;
  return !!(by && typeof by === 'object' && Object.keys(by).length > 0);
}

export function listGuestIntentTableLabels(session) {
  const by = session.nomihodaiGuestIntentByLabel;
  if (!by || typeof by !== 'object') return [];
  return Object.keys(by).sort((a, b) => Number(a) - Number(b));
}

function normalizeCheckoutRequestAt(raw) {
  const t = Number(raw);
  if (!Number.isFinite(t) || t <= 0) return null;
  return t;
}

function normalizeGuestIntent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const requestedAt = Number(raw.requestedAt);
  if (!Number.isFinite(requestedAt) || requestedAt <= 0) return null;
  const tableLabel =
    typeof raw.tableLabel === 'string' && raw.tableLabel.trim() ? raw.tableLabel.trim() : null;
  return tableLabel ? { requestedAt, tableLabel } : { requestedAt };
}

function normalizeNomihodai(n) {
  if (!n || !n.active) return null;
  const startMs = Number(n.startMs) || Date.now();
  const endMs = Number(n.endMs) || startMs + 90 * 60 * 1000;
  const lastOrderMs = Number(n.lastOrderMs) || endMs - NOMIHODAI_LO_BEFORE_END_MS;
  const guestCheckoutRequestedAt = Number(n.guestCheckoutRequestedAt);
  const extensionCount = Math.max(0, Number(n.extensionCount) || 0);
  const nextAutoExtendMs = Number(n.nextAutoExtendMs);
  return {
    active: true,
    startMs,
    endMs,
    lastOrderMs,
    people: Math.max(1, Number(n.people) || 1),
    menCount: Math.max(0, Number(n.menCount) || 0),
    womenCount: Math.max(0, Number(n.womenCount) || 0),
    billTotal: Math.max(0, Number(n.billTotal) || 0),
    extensionCount,
    nextAutoExtendMs:
      Number.isFinite(nextAutoExtendMs) && nextAutoExtendMs > startMs ? nextAutoExtendMs : endMs,
    ...(Number.isFinite(guestCheckoutRequestedAt) && guestCheckoutRequestedAt > 0
      ? { guestCheckoutRequestedAt }
      : {}),
  };
}

function normalizeFarewell(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const checkoutRequestedAt = Number(raw.checkoutRequestedAt);
  const checkoutCompletedAt = Number(raw.checkoutCompletedAt);
  if (!Number.isFinite(checkoutRequestedAt) || checkoutRequestedAt <= 0) return null;
  if (!Number.isFinite(checkoutCompletedAt) || checkoutCompletedAt <= 0) return null;
  return { checkoutRequestedAt, checkoutCompletedAt };
}

function isValidOrder(o) {
  return (
    o &&
    typeof o.id === 'string' &&
    typeof o.itemName === 'string' &&
    (o.itemPrice == null || Number.isFinite(Number(o.itemPrice))) &&
    (o.status === 'pending' || o.status === 'served')
  );
}

export function saveSession(session) {
  const next = { ...session, updatedAt: Date.now() };
  localStorage.setItem(NOMIHODAI_SESSION_KEY, JSON.stringify(next));
  broadcastSession();
  return next;
}

export function resetSession() {
  localStorage.removeItem(NOMIHODAI_SESSION_KEY);
  broadcastSession();
}
