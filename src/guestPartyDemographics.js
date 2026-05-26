/** 客席：男女児人数（DB未マイグレーション時の localStorage フォールバック含む） */

export const GUEST_PARTY_LOCAL_KEY = 'beifutei-guest-party-v1';
/** この端末のブラウザで人数入力を完了した卓（DB の capturedAt と照合） */
const GUEST_PARTY_ACK_KEY = 'beifutei-guest-party-ack-v1';

function readAckMap() {
  try {
    const raw = sessionStorage.getItem(GUEST_PARTY_ACK_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p.byLabel === 'object' ? p.byLabel : {};
  } catch {
    return {};
  }
}

function writeAckMap(byLabel) {
  sessionStorage.setItem(GUEST_PARTY_ACK_KEY, JSON.stringify({ version: 1, byLabel }));
}

/** @param {string} tableLabel @param {number} capturedAt */
export function markGuestPartyAcknowledged(tableLabel, capturedAt) {
  const key = String(tableLabel ?? '').trim();
  const cap = Number(capturedAt);
  if (!key || !Number.isFinite(cap) || cap <= 0) return;
  const map = readAckMap();
  map[key] = cap;
  writeAckMap(map);
}

/** @param {string} tableLabel */
export function clearGuestPartyAcknowledged(tableLabel) {
  const key = String(tableLabel ?? '').trim();
  if (!key) return;
  const map = readAckMap();
  delete map[key];
  writeAckMap(map);
}

/**
 * DB に人数があっても、この端末で同じ capturedAt を確認していなければ未完了扱い
 * @param {string} tableLabel
 * @param {number | undefined} capturedAt
 */
export function isGuestPartyAcknowledgedOnDevice(tableLabel, capturedAt) {
  const cap = Number(capturedAt);
  if (!Number.isFinite(cap) || cap <= 0) return false;
  const key = String(tableLabel ?? '').trim();
  if (!key) return false;
  return Number(readAckMap()[key]) === cap;
}

/**
 * @param {{ men?: number, women?: number, children?: number }} p
 * @returns {string}
 */
export function formatGuestPartyShort(p) {
  const m = Math.max(0, Math.floor(Number(p?.men) || 0));
  const w = Math.max(0, Math.floor(Number(p?.women) || 0));
  const c = Math.max(0, Math.floor(Number(p?.children) || 0));
  if (m + w + c <= 0) return '';
  const parts = [];
  if (p?.locale === 'en') parts.push('EN');
  else if (p?.locale === 'ja') parts.push('日');
  if (m > 0) parts.push(`男${m}`);
  if (w > 0) parts.push(`女${w}`);
  if (c > 0) parts.push(`子${c}`);
  return parts.join(' ');
}

/** @param {'ja'|'en'|string|undefined} locale */
export function normalizeGuestPartyLocale(locale) {
  return locale === 'en' ? 'en' : 'ja';
}

function readLocalMap() {
  try {
    const raw = localStorage.getItem(GUEST_PARTY_LOCAL_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p.byLabel === 'object' ? p.byLabel : {};
  } catch {
    return {};
  }
}

function writeLocalMap(byLabel) {
  localStorage.setItem(GUEST_PARTY_LOCAL_KEY, JSON.stringify({ version: 1, byLabel }));
}

/** @returns {Record<string, { men: number, women: number, children: number, capturedAt: number }>} */
export function loadGuestPartyLocalAll() {
  const out = {};
  for (const [lbl, row] of Object.entries(readLocalMap())) {
    const cap = Number(row?.capturedAt);
    if (!Number.isFinite(cap) || cap <= 0) continue;
    out[lbl] = {
      men: Math.max(0, Math.floor(Number(row.men) || 0)),
      women: Math.max(0, Math.floor(Number(row.women) || 0)),
      children: Math.max(0, Math.floor(Number(row.children) || 0)),
      locale: normalizeGuestPartyLocale(row.locale),
      capturedAt: cap,
    };
  }
  return out;
}

/** @param {string} tableLabel */
export function clearGuestPartyLocal(tableLabel) {
  const key = String(tableLabel ?? '').trim();
  if (!key) return;
  const map = readLocalMap();
  delete map[key];
  writeLocalMap(map);
  clearGuestPartyAcknowledged(key);
}

/**
 * @param {string} tableLabel
 * @param {{ men: number, women: number, children: number, capturedAt: number }} data
 */
export function saveGuestPartyLocal(tableLabel, data) {
  const key = String(tableLabel ?? '').trim();
  if (!key) return;
  const map = readLocalMap();
  map[key] = data;
  writeLocalMap(map);
}

/** @param {Record<string, unknown> | null | undefined} row */
export function guestPartyFromTableRow(row) {
  if (!row) return null;
  const cap = Number(row.guest_party_captured_at);
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return {
    men: Math.max(0, Math.floor(Number(row.guest_party_men) || 0)),
    women: Math.max(0, Math.floor(Number(row.guest_party_women) || 0)),
    children: Math.max(0, Math.floor(Number(row.guest_party_children) || 0)),
    locale: normalizeGuestPartyLocale(row.guest_party_locale),
    capturedAt: cap,
  };
}
