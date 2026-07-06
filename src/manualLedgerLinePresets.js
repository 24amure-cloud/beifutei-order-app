/** 手書き後入力フォームの明細候補（localStorage・最大10件） */

export const MANUAL_LEDGER_LINE_PRESETS_KEY = 'beifutei-manual-ledger-line-presets-v1';
const MAX_PRESETS = 10;

/** @typedef {{ name: string, price: number }} ManualLedgerLinePreset */

/** @returns {ManualLedgerLinePreset[]} */
export function loadManualLedgerLinePresets() {
  try {
    const raw = localStorage.getItem(MANUAL_LEDGER_LINE_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        name: String(row?.name || '').trim().slice(0, 60),
        price: Math.max(0, Math.round(Number(row?.price) || 0)),
      }))
      .filter((row) => row.name && row.price > 0)
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

/** @param {ManualLedgerLinePreset[]} presets */
function persistManualLedgerLinePresets(presets) {
  localStorage.setItem(MANUAL_LEDGER_LINE_PRESETS_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
}

/**
 * 登録した明細を候補の先頭へ（同名・同額は1つにまとめる）
 * @param {Array<{ name?: string, price?: number }>} lines
 */
export function rememberManualLedgerLinePresets(lines) {
  const incoming = (lines || [])
    .map((row) => ({
      name: String(row?.name || '').trim().slice(0, 60),
      price: Math.max(0, Math.round(Number(row?.price) || 0)),
    }))
    .filter((row) => row.name && row.price > 0);
  if (incoming.length === 0) return loadManualLedgerLinePresets();

  const keyOf = (row) => `${row.name}\0${row.price}`;
  const seen = new Set();
  const next = [];

  for (const row of [...incoming, ...loadManualLedgerLinePresets()]) {
    const key = keyOf(row);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(row);
    if (next.length >= MAX_PRESETS) break;
  }

  persistManualLedgerLinePresets(next);
  return next;
}
