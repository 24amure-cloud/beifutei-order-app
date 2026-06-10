/**
 * 日計を Supabase に同期（端末・ポートが変わってもカレンダー／日計が復元できるようにする）
 */

import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import {
  isValidEntry,
  loadDailyLedger,
  loadDeletedLedgerIds,
  mergeDeletedLedgerIds,
  persistDailyLedgerEntries,
} from './dailyLedger.js';

const TABLE = 'beifutei_daily_ledger';
const DELETIONS_TABLE = 'beifutei_daily_ledger_deletions';
const PULL_LIMIT = 2000;
const DELETIONS_PULL_LIMIT = 10000;

function entryFromRow(row) {
  const p = row?.payload;
  if (!p || typeof p !== 'object') return null;
  const e = { ...p, id: String(p.id || row.id) };
  return isValidEntry(e) ? e : null;
}

async function pullDeletedLedgerIdsFromSupabase() {
  if (!isSupabaseConfigured) return loadDeletedLedgerIds();
  try {
    const { data, error } = await supabase
      .from(DELETIONS_TABLE)
      .select('id')
      .order('deleted_at', { ascending: true })
      .limit(DELETIONS_PULL_LIMIT);
    if (error) return loadDeletedLedgerIds();
    const remote = new Set((data || []).map((row) => String(row.id)).filter(Boolean));
    return mergeDeletedLedgerIds(remote);
  } catch {
    return loadDeletedLedgerIds();
  }
}

/** @param {string} entryId */
export async function pushDeletedLedgerIdToSupabase(entryId) {
  const id = String(entryId || '').trim();
  if (!isSupabaseConfigured || !id) return { ok: false, skipped: true };
  try {
    const { error } = await supabase.from(DELETIONS_TABLE).upsert(
      { id, deleted_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/** @param {import('./dailyLedger.js').LedgerEntry} entry */
export async function pushDailyLedgerEntryToSupabase(entry) {
  if (!isSupabaseConfigured || !entry?.id) return { ok: false, skipped: true };
  if (loadDeletedLedgerIds().has(entry.id)) return { ok: false, skipped: true, deleted: true };
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
    const deletedIds = await pullDeletedLedgerIdsFromSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, payload')
      .order('recorded_at', { ascending: true })
      .limit(PULL_LIMIT);
    if (error) return { ok: false, error: error.message };

    const remote = (data || []).map(entryFromRow).filter(Boolean);
    const local = loadDailyLedger().entries;
    const map = new Map();
    for (const e of local) {
      if (!deletedIds.has(e.id)) map.set(e.id, e);
    }
    for (const e of remote) {
      if (deletedIds.has(e.id)) {
        purgeDailyLedgerEntryFromSupabase(e.id);
        continue;
      }
      map.set(e.id, e);
    }
    const merged = Array.from(map.values())
      .filter((e) => !deletedIds.has(e.id))
      .sort((a, b) => a.recordedAt - b.recordedAt);
    persistDailyLedgerEntries(merged);
    const rows = merged.map((e) => ({
      id: e.id,
      date_key: e.dateKey,
      recorded_at: e.recordedAt,
      payload: e,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
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

/** 日計1件をクラウドから削除し tombstone を共有（再同期で復活しない） */
export async function purgeDailyLedgerEntryFromSupabase(entryId) {
  const id = String(entryId || '').trim();
  if (!isSupabaseConfigured || !id) return { ok: false, skipped: true };
  const tomb = await pushDeletedLedgerIdToSupabase(id);
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) return { ok: false, error: error.message, tombstone: tomb.ok };
    return { ok: true, tombstone: tomb.ok };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), tombstone: tomb.ok };
  }
}

/** @deprecated use purgeDailyLedgerEntryFromSupabase */
export async function deleteDailyLedgerEntryFromSupabase(entryId) {
  return purgeDailyLedgerEntryFromSupabase(entryId);
}
