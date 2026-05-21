/**
 * 日計を Supabase に同期（端末・ポートが変わってもカレンダー／日計が復元できるようにする）
 */

import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { isValidEntry, loadDailyLedger, persistDailyLedgerEntries } from './dailyLedger.js';

const TABLE = 'beifutei_daily_ledger';
const PULL_LIMIT = 2000;

function entryFromRow(row) {
  const p = row?.payload;
  if (!p || typeof p !== 'object') return null;
  const e = { ...p, id: String(p.id || row.id) };
  return isValidEntry(e) ? e : null;
}

/** @param {import('./dailyLedger.js').LedgerEntry} entry */
export async function pushDailyLedgerEntryToSupabase(entry) {
  if (!isSupabaseConfigured || !entry?.id) return { ok: false, skipped: true };
  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        id: entry.id,
        date_key: entry.dateKey,
        recorded_at: entry.recordedAt,
        payload: entry,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/** クラウドと local をマージして local に保存 */
export async function pullAndMergeDailyLedgerFromSupabase() {
  if (!isSupabaseConfigured) return { ok: false, skipped: true };
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, payload')
      .order('recorded_at', { ascending: true })
      .limit(PULL_LIMIT);
    if (error) return { ok: false, error: error.message };

    const remote = (data || []).map(entryFromRow).filter(Boolean);
    const local = loadDailyLedger().entries;
    const map = new Map();
    for (const e of local) map.set(e.id, e);
    for (const e of remote) map.set(e.id, e);
    const merged = Array.from(map.values()).sort((a, b) => a.recordedAt - b.recordedAt);
    persistDailyLedgerEntries(merged);
    if (merged.length > 0) {
      const rows = merged.map((e) => ({
        id: e.id,
        date_key: e.dateKey,
        recorded_at: e.recordedAt,
        payload: e,
        updated_at: new Date().toISOString(),
      }));
      supabase.from(TABLE).upsert(rows, { onConflict: 'id' }).then(() => {});
    }
    const added = Math.max(0, merged.length - local.length);
    try {
      window.dispatchEvent(new CustomEvent('beifutei-daily-ledger-synced', { detail: { ok: true, added, merged: merged.length } }));
    } catch {
      /* ignore */
    }
    return { ok: true, merged: merged.length, added };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
