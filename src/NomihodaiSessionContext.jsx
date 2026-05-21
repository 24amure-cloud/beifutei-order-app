import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  NOMIHODAI_CHANNEL_NAME,
  NOMIHODAI_SESSION_KEY,
  broadcastSession,
  getNomihodaiForTable,
  getGuestIntentForTable,
  listGuestIntentTableLabels,
  normalizeTableLabelKey,
  normalizeTableMemos,
  countActiveNomihodaiTables,
  isDbNomihodaiActiveFlag,
} from './nomihodaiSession.js';
import { appendDailyLedgerEntry } from './dailyLedger.js';
import { NOMIHODAI_PENDING_QUEUE_LIMIT_ENABLED, TABLE_MEMO_MAX_LEN } from './nomihodaiSession.js';
import {
  NOMIHODAI_BASE_MS,
  NOMIHODAI_EXTENSION_MS,
  NOMIHODAI_EXTENSION_PRICE_YEN,
  NOMIHODAI_EXTENSION_MINUTES,
  NOMIHODAI_BASE_MINUTES,
  NOMIHODAI_LO_BEFORE_END_MS,
} from './nomihodaiConstants.js';
import { supabase } from './supabaseClient.js';
import {
  classifySupabaseProbeError,
  describeSupabaseConnectionIssue,
  guestHintFromSupabaseError,
  probeSupabaseOrdersTable,
} from './supabaseHealth.js';
import {
  markKitchenRestSyncError,
  markKitchenRestSyncOk,
  pushKitchenDiag,
  pushKitchenDiagFromSupabase,
  reportRealtimeChannelStatus,
  isKitchenRealtimeLive,
} from './kitchenDiagnostics.js';
import {
  ALCOHOL_CHARGE_AFTER_21_YEN,
  ALCOHOL_CHARGE_BEFORE_21_YEN,
  getAlcoholTableCharge,
} from './alcoholTableCharge.js';
import {
  clearGuestPartyLocal,
  guestPartyFromTableRow,
  loadGuestPartyLocalAll,
  saveGuestPartyLocal,
} from './guestPartyDemographics.js';

const Ctx = createContext(null);

/** 会計依頼：checkout_requested_at のみ書き込み（upsert → 失敗時は update→件数確認→insert） */
async function setCheckoutRequestedAtForTable(supabaseClient, tableLabel, atMs) {
  const lbl = String(tableLabel ?? '').trim();
  if (!lbl) {
    return { error: { message: 'NO_TABLE' } };
  }
  const ts = Number(atMs) || Date.now();

  const upMerge = await supabaseClient
    .from('beifutei_table_states')
    .upsert({ table_label: lbl, checkout_requested_at: ts }, { onConflict: 'table_label', defaultToNull: false });
  if (!upMerge.error) return upMerge;

  const upOnly = await supabaseClient
    .from('beifutei_table_states')
    .update({ checkout_requested_at: ts })
    .eq('table_label', lbl)
    .select('table_label');
  if (!upOnly.error && Array.isArray(upOnly.data) && upOnly.data.length > 0) return upOnly;

  return supabaseClient.from('beifutei_table_states').insert({
    table_label: lbl,
    checkout_requested_at: ts,
    nomihodai_active: false,
    nomihodai_people: 0,
    nomihodai_men: 0,
    nomihodai_women: 0,
    nomihodai_bill_total: 0,
    nomihodai_extension_count: 0,
  });
}

const NOMIHODAI_PRICE_MEN = 3500;
const NOMIHODAI_PRICE_WOMEN = 3000;

/** Supabase beifutei_table_states 行から客席フロー用オブジェクトを生成 */
function farewellFromTableRow(row) {
  if (!row) return null;
  const rq = Number(row.guest_farewell_requested_at);
  const cp = Number(row.guest_farewell_completed_at);
  if (!Number.isFinite(rq) || rq <= 0 || !Number.isFinite(cp) || cp <= 0) return null;
  return { checkoutRequestedAt: rq, checkoutCompletedAt: cp };
}

/** 列未追加の Supabase でも他処理を壊さないよう、客席フロー列だけベストエフォート更新 */
async function patchGuestFarewellColumns(supabaseClient, tableLabel, pair) {
  const tl = String(tableLabel);
  const payload =
    pair && Number.isFinite(Number(pair.requestedAt)) && Number.isFinite(Number(pair.completedAt))
      ? {
          guest_farewell_requested_at: Number(pair.requestedAt),
          guest_farewell_completed_at: Number(pair.completedAt),
        }
      : { guest_farewell_requested_at: null, guest_farewell_completed_at: null };
  /* 列未マイグレーション時は PostgREST がエラーを返すが、会計・NH 本体は継続済みのため握りつぶす */
  await supabaseClient.from('beifutei_table_states').update(payload).eq('table_label', tl);
}

/** 会計確定後に卓状態へ書き込むリセット（飲み放題停止・依頼解除・メモ・チャージ解除） */
function checkoutTableResetPayload(tableLabel) {
  const tl = String(tableLabel ?? '').trim();
  return {
    table_label: tl,
    nomihodai_active: false,
    nomihodai_start_ms: null,
    nomihodai_end_ms: null,
    nomihodai_people: 0,
    nomihodai_men: 0,
    nomihodai_women: 0,
    nomihodai_bill_total: 0,
    nomihodai_extension_count: 0,
    guest_intent_requested_at: null,
    checkout_requested_at: null,
    table_memo: null,
    alcohol_charge_people: 0,
    alcohol_charge_yen_per_person: 0,
    guest_party_men: 0,
    guest_party_women: 0,
    guest_party_children: 0,
    guest_party_captured_at: null,
    guest_party_locale: null,
  };
}

/** 同一卓が複数行になったとき（Realtime と trim 表記ゆれ）を1行にまとめる */
function normalizeTableStatesRows(rows) {
  if (!Array.isArray(rows)) return [];
  const by = new Map();
  for (const row of rows) {
    const k = normalizeTableLabelKey(row?.table_label ?? '');
    if (!k) continue;
    const prev = by.get(k);
    by.set(k, prev ? { ...prev, ...row, table_label: k } : { ...row, table_label: k });
  }
  return [...by.values()];
}

function normalizeItemPriceYen(raw) {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, raw);
  const direct = Number(raw);
  if (Number.isFinite(direct)) return Math.max(0, direct);
  if (typeof raw === 'string') {
    const compact = raw.replace(/[,\s　]/g, '');
    const m = compact.match(/-?\d+/);
    if (m) {
      const n = Number(m[0]);
      return Number.isFinite(n) ? Math.max(0, n) : 0;
    }
  }
  return 0;
}

export function NomihodaiSessionProvider({ children }) {
  const [localDeviceState, setLocalDeviceState] = useState(() => {
    try {
      const raw = localStorage.getItem(NOMIHODAI_SESSION_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          tableId: p.tableId || 'default',
          tableLabel: normalizeTableLabelKey(p.tableLabel ?? '') || '3',
          nomihodaiFarewell: p.nomihodaiFarewell || null,
        };
      }
    } catch {}
    return { tableId: 'default', tableLabel: '3', nomihodaiFarewell: null };
  });

  const saveLocalDeviceState = useCallback((updater) => {
    setLocalDeviceState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(NOMIHODAI_SESSION_KEY, JSON.stringify({ ...next, updatedAt: Date.now() }));
        broadcastSession();
      } catch {}
      return next;
    });
  }, []);

  const reloadLocalDeviceFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(NOMIHODAI_SESSION_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return;
      setLocalDeviceState({
        tableId: p.tableId || 'default',
        tableLabel: normalizeTableLabelKey(p.tableLabel ?? '') || '3',
        nomihodaiFarewell: p.nomihodaiFarewell || null,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const [dbOrders, setDbOrders] = useState([]);
  const [dbTables, setDbTables] = useState([]);
  const [dbConnection, setDbConnection] = useState({ ok: true, kind: 'pending', host: '', message: '' });
  const [now, setNow] = useState(() => Date.now());
  /** 楽観追加直後に SELECT が空（RLS 等）で全消ししないよう refetch で参照する */
  const ordersRecentOptimisticRef = useRef(0);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === NOMIHODAI_SESSION_KEY) reloadLocalDeviceFromStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reloadLocalDeviceFromStorage]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const ch = new BroadcastChannel(NOMIHODAI_CHANNEL_NAME);
    ch.onmessage = (ev) => {
      if (ev?.data?.type === 'session-updated') reloadLocalDeviceFromStorage();
    };
    return () => ch.close();
  }, [reloadLocalDeviceFromStorage]);

  /** DB でフローが消えたのに local に古い farewell が残る場合のみ掃除（マイグレーション済み環境） */
  useEffect(() => {
    const myLabel = normalizeTableLabelKey(localDeviceState.tableLabel ?? '') || '3';
    const row = dbTables.find((r) => normalizeTableLabelKey(r.table_label ?? '') === myLabel);
    if (!row || !('guest_farewell_completed_at' in row)) return;
    if (farewellFromTableRow(row) || !localDeviceState.nomihodaiFarewell) return;
    saveLocalDeviceState((s) => ({ ...s, nomihodaiFarewell: null }));
  }, [dbTables, localDeviceState.tableLabel, localDeviceState.nomihodaiFarewell, saveLocalDeviceState]);

  /** Realtime 購読の明示的 teardown（再同期で WS を張り直す） */
  const stopRealtimeRef = useRef(() => {});
  /** CHANNEL_ERROR / TIMED_OUT 後の自動再接続（デバウンス） */
  const realtimeReconnectTimerRef = useRef(0);
  const startRealtimeRef = useRef(() => {});

  const scheduleRealtimeReconnectOnFailure = useCallback((status) => {
    if (status === 'SUBSCRIBED') return;
    if (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') return;
    if (realtimeReconnectTimerRef.current) return;
    realtimeReconnectTimerRef.current = window.setTimeout(() => {
      realtimeReconnectTimerRef.current = 0;
      try {
        startRealtimeRef.current();
      } catch {
        /* ignore */
      }
    }, 5000);
  }, []);

  const startRealtimeChannels = useCallback(() => {
    if (realtimeReconnectTimerRef.current) {
      window.clearTimeout(realtimeReconnectTimerRef.current);
      realtimeReconnectTimerRef.current = 0;
    }
    stopRealtimeRef.current();
    const ordersSub = supabase
      .channel('public:beifutei_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beifutei_orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDbOrders((prev) => {
            const row = payload.new;
            const id = row?.id;
            if (!id) return [...prev, row];
            const idx = prev.findIndex((o) => o.id === id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = row;
              return copy;
            }
            return [...prev, row];
          });
        } else if (payload.eventType === 'UPDATE') {
          setDbOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)));
        } else if (payload.eventType === 'DELETE') {
          setDbOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        }
      })
      .subscribe((status, err) => {
        reportRealtimeChannelStatus('orders', status, err);
        scheduleRealtimeReconnectOnFailure(status);
      });

    const tablesSub = supabase
      .channel('public:beifutei_table_states')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beifutei_table_states' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setDbTables((prev) => {
            const key = normalizeTableLabelKey(payload.new?.table_label ?? '');
            if (!key) return prev;
            const mergedNew = { ...payload.new, table_label: key };
            const idx = prev.findIndex((t) => normalizeTableLabelKey(t.table_label ?? '') === key);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...mergedNew };
              return normalizeTableStatesRows(copy);
            }
            return normalizeTableStatesRows([...prev, mergedNew]);
          });
        } else if (payload.eventType === 'DELETE') {
          const key = normalizeTableLabelKey(payload.old?.table_label ?? '');
          setDbTables((prev) => normalizeTableStatesRows(prev.filter((t) => normalizeTableLabelKey(t.table_label ?? '') !== key)));
        }
      })
      .subscribe((status, err) => {
        reportRealtimeChannelStatus('tables', status, err);
        scheduleRealtimeReconnectOnFailure(status);
      });

    stopRealtimeRef.current = () => {
      supabase.removeChannel(ordersSub);
      supabase.removeChannel(tablesSub);
    };
  }, [scheduleRealtimeReconnectOnFailure]);

  useEffect(() => {
    startRealtimeRef.current = startRealtimeChannels;
  }, [startRealtimeChannels]);

  const applyDbConnectionFromError = useCallback((error) => {
    const kind = classifySupabaseProbeError(error);
    if (kind === 'ok') return;
    const probe = { ok: false, kind, host: '', detail: error?.message || '' };
    try {
      const u = import.meta.env.VITE_SUPABASE_URL;
      if (u) probe.host = new URL(String(u).trim()).host;
    } catch {
      /* ignore */
    }
    setDbConnection({
      ok: false,
      kind,
      host: probe.host,
      message: describeSupabaseConnectionIssue(probe),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const probe = await probeSupabaseOrdersTable();
      if (cancelled) return;
      if (probe.ok) {
        setDbConnection({ ok: true, kind: 'ok', host: probe.host, message: '' });
        return;
      }
      setDbConnection({
        ok: false,
        kind: probe.kind,
        host: probe.host,
        message: describeSupabaseConnectionIssue(probe),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Supabase 初回取得 + Realtime（再同期ボタンで購読だけ張り直せる）
  useEffect(() => {
    const fetchInitial = async () => {
      const [ordersRes, tablesRes] = await Promise.all([
        supabase.from('beifutei_orders').select('*').order('created_at', { ascending: true }),
        supabase.from('beifutei_table_states').select('*'),
      ]);
      if (ordersRes.error) {
        markKitchenRestSyncError('beifutei_orders:initial', ordersRes.error);
        applyDbConnectionFromError(ordersRes.error);
      } else if (Array.isArray(ordersRes.data)) setDbOrders(ordersRes.data);
      if (tablesRes.error) markKitchenRestSyncError('beifutei_table_states:initial', tablesRes.error);
      else if (Array.isArray(tablesRes.data)) setDbTables(normalizeTableStatesRows(tablesRes.data));
      if (!ordersRes.error && !tablesRes.error) {
        markKitchenRestSyncOk();
        setDbConnection((prev) => ({ ok: true, kind: 'ok', host: prev.host || '', message: '' }));
      }
    };
    void fetchInitial();
    startRealtimeChannels();
    return () => {
      if (realtimeReconnectTimerRef.current) {
        window.clearTimeout(realtimeReconnectTimerRef.current);
        realtimeReconnectTimerRef.current = 0;
      }
      stopRealtimeRef.current();
    };
  }, [startRealtimeChannels, applyDbConnectionFromError]);

  const refetchOrdersFromDb = useCallback(async (opts = {}) => {
    const force = !!opts.force;
    const { data, error } = await supabase.from('beifutei_orders').select('*').order('created_at', { ascending: true });
    if (error) {
      markKitchenRestSyncError('beifutei_orders:poll', error);
      return;
    }
    if (!Array.isArray(data)) return;
    markKitchenRestSyncOk();
    setDbOrders((prev) => {
      if (
        !force &&
        data.length === 0 &&
        prev.length > 0 &&
        Date.now() - ordersRecentOptimisticRef.current < 25000
      ) {
        return prev;
      }
      return data;
    });
  }, []);

  const refetchTablesFromDb = useCallback(async () => {
    const { data, error } = await supabase.from('beifutei_table_states').select('*');
    if (error) {
      markKitchenRestSyncError('beifutei_table_states:poll', error);
      return;
    }
    markKitchenRestSyncOk();
    if (data) setDbTables(normalizeTableStatesRows(data));
  }, []);

  /**
   * DB の真実をそのまま state に反映（楽観 INSERT ガードなし）＋任意で Realtime 購読を張り直す。
   * スリープ／Wi‑Fi 瞬断後に「注文が届かないがリロードすると出る」系の保険。
   */
  const fullResyncDbFromSupabase = useCallback(
    async (opts = {}) => {
      const reconnectRealtime = !!opts.reconnectRealtime;
      const log = !!opts.log;
      const [ordersRes, tablesRes] = await Promise.all([
        supabase.from('beifutei_orders').select('*').order('created_at', { ascending: true }),
        supabase.from('beifutei_table_states').select('*'),
      ]);
      let ok = true;
      if (ordersRes.error) {
        ok = false;
        markKitchenRestSyncError('beifutei_orders:resync', ordersRes.error);
      } else if (Array.isArray(ordersRes.data)) {
        setDbOrders(ordersRes.data);
      }
      if (tablesRes.error) {
        ok = false;
        markKitchenRestSyncError('beifutei_table_states:resync', tablesRes.error);
      } else if (Array.isArray(tablesRes.data)) {
        setDbTables(normalizeTableStatesRows(tablesRes.data));
      }
      if (ok) markKitchenRestSyncOk();
      if (reconnectRealtime) startRealtimeChannels();
      if (log) {
        pushKitchenDiag(
          ok ? 'ok' : 'warn',
          'resync',
          reconnectRealtime
            ? '再同期: 注文・卓状態をDBから取得し Realtime を再接続しました'
            : '再同期: 注文・卓状態をDBから再取得しました',
          ok ? '' : 'SELECT エラーを確認してください',
        );
      }
      return { ok, ordersError: ordersRes.error, tablesError: tablesRes.error };
    },
    [startRealtimeChannels],
  );

  /** Realtime 未設定・接続途切れでも厨房と客席が揃うよう定期同期 */
  useEffect(() => {
    const id = window.setInterval(() => {
      void refetchOrdersFromDb();
      void refetchTablesFromDb();
    }, 8000);
    return () => clearInterval(id);
  }, [refetchOrdersFromDb, refetchTablesFromDb]);

  useEffect(() => {
    const pull = () => {
      void refetchOrdersFromDb({ force: true });
      void refetchTablesFromDb();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        pull();
        /* LIVE のときに毎回張り直すと WS が切れて赤バッジ・注文取りこぼしの原因になる */
        if (!isKitchenRealtimeLive()) startRealtimeChannels();
      }
    };
    const onFocus = () => {
      pull();
      if (!isKitchenRealtimeLive()) startRealtimeChannels();
    };
    const onOnline = () => {
      pull();
      startRealtimeChannels();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [refetchOrdersFromDb, refetchTablesFromDb, startRealtimeChannels]);

  /** PWA / bfcache 復帰: Realtime が死んだままのときに備え SELECT ＋購読張り直し */
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) void fullResyncDbFromSupabase({ reconnectRealtime: true, log: false });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [fullResyncDbFromSupabase]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Build the `session` object compatible with existing UI
  const session = useMemo(() => {
    const nomihodaiByLabel = {};
    const nomihodaiGuestIntentByLabel = {};
    const tableMemoByLabel = {};
    const guestPartyByLabel = {};
    /** 卓ラベル → 会計依頼時刻（厨房は全卓分を参照） */
    const checkoutRequestByLabel = {};
    let checkoutRequestAt = null;

    const deviceLabel = normalizeTableLabelKey(localDeviceState.tableLabel ?? '') || '3';

    dbTables.forEach((row) => {
      const lbl = normalizeTableLabelKey(row.table_label ?? '');
      if (!lbl) return;
      if (isDbNomihodaiActiveFlag(row.nomihodai_active)) {
        nomihodaiByLabel[lbl] = {
          active: true,
          startMs: Number(row.nomihodai_start_ms),
          endMs: Number(row.nomihodai_end_ms),
          lastOrderMs: Number(row.nomihodai_end_ms) - NOMIHODAI_LO_BEFORE_END_MS,
          people: Number(row.nomihodai_people),
          menCount: Number(row.nomihodai_men),
          womenCount: Number(row.nomihodai_women),
          billTotal: Number(row.nomihodai_bill_total),
          extensionCount: Number(row.nomihodai_extension_count),
          guestCheckoutRequestedAt: row.checkout_requested_at ? Number(row.checkout_requested_at) : null,
          nextAutoExtendMs: Number(row.nomihodai_end_ms)
        };
      }
      if (row.guest_intent_requested_at) {
        nomihodaiGuestIntentByLabel[lbl] = { requestedAt: Number(row.guest_intent_requested_at) };
      }
      if (row.table_memo) {
        tableMemoByLabel[lbl] = row.table_memo;
      }
      const party = guestPartyFromTableRow(row);
      if (party) guestPartyByLabel[lbl] = party;
      const cq = row.checkout_requested_at != null ? Number(row.checkout_requested_at) : null;
      if (Number.isFinite(cq) && cq > 0) {
        checkoutRequestByLabel[lbl] = cq;
      }
      if (lbl === deviceLabel && Number.isFinite(cq) && cq > 0) {
        checkoutRequestAt = cq;
      }
    });

    const orders = dbOrders.map(row => ({
      id: row.id,
      tableId: 'default',
      tableLabel: normalizeTableLabelKey(row.table_label ?? '') || String(row.table_label ?? '').trim(),
      itemId: row.item_id,
      itemName: row.item_name,
      itemPrice: Number(row.item_price),
      status: row.status,
      isNomihodai: row.is_nomihodai,
      createdAt: Number(row.created_at)
    }));

    const myLabel = deviceLabel;
    const myTableRow = dbTables.find((r) => normalizeTableLabelKey(r.table_label ?? '') === myLabel);
    const farewellFromDb = farewellFromTableRow(myTableRow);

    /** 厨房：会計後の THANK YOU / SESSION CLOSED が卓タブレットに出ている卓 */
    const guestFarewellActiveByLabel = {};
    for (const row of dbTables) {
      const lbl = normalizeTableLabelKey(row.table_label ?? '');
      if (!lbl) continue;
      if (farewellFromTableRow(row)) guestFarewellActiveByLabel[lbl] = true;
    }

    const localParty = loadGuestPartyLocalAll();
    for (const [lbl, party] of Object.entries(localParty)) {
      if (!guestPartyByLabel[lbl]) guestPartyByLabel[lbl] = party;
    }

    const alcoholChargeByLabel = {};
    dbTables.forEach((row) => {
      const lbl = normalizeTableLabelKey(row.table_label ?? '');
      if (!lbl) return;
      const pe = Math.max(0, Number(row.alcohol_charge_people) || 0);
      const ypp = Math.max(0, Number(row.alcohol_charge_yen_per_person) || 0);
      if (pe > 0 && ypp > 0) {
        alcoholChargeByLabel[lbl] = { people: pe, yenPerPerson: ypp };
      }
    });

    return {
      tableId: localDeviceState.tableId,
      tableLabel: deviceLabel,
      /** DB（全端末共有）を優先。未マイグレーション時は従来どおり local のみ */
      nomihodaiFarewell: farewellFromDb ?? localDeviceState.nomihodaiFarewell,
      nomihodaiByLabel,
      nomihodaiGuestIntentByLabel,
      tableMemoByLabel,
      guestPartyByLabel,
      checkoutRequestByLabel,
      checkoutRequestAt,
      guestFarewellActiveByLabel,
      alcoholChargeByLabel,
      orders,
      updatedAt: Date.now()
    };
  }, [dbOrders, dbTables, localDeviceState]);

  const setSessionTableLabel = useCallback((label) => {
    const next = normalizeTableLabelKey(label ?? '');
    saveLocalDeviceState((s) => ({
      ...s,
      tableLabel: next !== '' ? next : normalizeTableLabelKey(s.tableLabel ?? '') || '3',
    }));
  }, [saveLocalDeviceState]);

  // Actions translating to Supabase Updates
  const addGuestOrders = useCallback(async (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return { ok: true };
    const lbl = normalizeTableLabelKey(session.tableLabel ?? '');
    const party =
      session.guestPartyByLabel?.[lbl] ?? loadGuestPartyLocalAll()[lbl] ?? null;
    if (!(party?.capturedAt > 0)) {
      return {
        ok: false,
        errorMessage: 'PARTY_NOT_CAPTURED',
        guestHint: 'ご来店人数の入力が完了していません。',
      };
    }
    const t = Date.now();
    const inserts = rows.map((r, idx) => ({
      id: `ord-${t}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      table_label: session.tableLabel,
      item_id: r.itemId || `guest-item-${idx}`,
      item_name: r.itemName,
      item_price: normalizeItemPriceYen(r.itemPrice ?? r.price),
      status: 'pending',
      is_nomihodai: !!r.isNomihodai,
      created_at: Date.now() + idx,
    }));
    ordersRecentOptimisticRef.current = Date.now();
    setDbOrders((prev) => [...prev, ...inserts]);
    const { error } = await supabase.from('beifutei_orders').insert(inserts);
    if (error) {
      pushKitchenDiagFromSupabase('beifutei_orders:insert', error, '客席まとめINSERT');
      applyDbConnectionFromError(error);
      setDbOrders((prev) => prev.filter((o) => !inserts.some((i) => i.id === o.id)));
      return {
        ok: false,
        errorCode: error.code,
        errorMessage: error.message || String(error),
        guestHint: guestHintFromSupabaseError(error),
      };
    }
    /* INSERT 成功後の即時 select は RLS で [] になり得るため行わない（楽観行＋Realtime／定期 refetch に任せる） */
    return { ok: true };
  }, [session.tableLabel, session.guestPartyByLabel, applyDbConnectionFromError]);

  const submitGuestPartyDemographics = useCallback(
    async ({ men, women, children, locale }) => {
      const lbl = normalizeTableLabelKey(session.tableLabel ?? '');
      if (!lbl) return { ok: false, errorMessage: 'NO_TABLE' };

      const m = Math.max(0, Math.min(99, Math.floor(Number(men) || 0)));
      const w = Math.max(0, Math.min(99, Math.floor(Number(women) || 0)));
      const c = Math.max(0, Math.min(99, Math.floor(Number(children) || 0)));
      if (m + w + c < 1) return { ok: false, errorMessage: 'EMPTY_PARTY' };
      const loc = locale === 'en' ? 'en' : 'ja';

      const capturedAt = Date.now();
      const party = { men: m, women: w, children: c, locale: loc, capturedAt };

      setDbTables((prev) => {
        const idx = prev.findIndex((t) => normalizeTableLabelKey(t.table_label ?? '') === lbl);
        const patch = {
          table_label: lbl,
          guest_party_men: m,
          guest_party_women: w,
          guest_party_children: c,
          guest_party_captured_at: capturedAt,
          guest_party_locale: loc,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...patch };
          return normalizeTableStatesRows(next);
        }
        return normalizeTableStatesRows([...prev, patch]);
      });

      saveGuestPartyLocal(lbl, party);

      const { error } = await supabase.from('beifutei_table_states').upsert(
        {
          table_label: lbl,
          guest_party_men: m,
          guest_party_women: w,
          guest_party_children: c,
          guest_party_captured_at: capturedAt,
          guest_party_locale: loc,
        },
        { onConflict: 'table_label', defaultToNull: false },
      );

      if (error) {
        pushKitchenDiagFromSupabase('beifutei_table_states:upsert', error, '客席人数upsert');
        applyDbConnectionFromError(error);
        /* localStorage は保存済みのため客席は進める */
      }

      void refetchTablesFromDb();
      return { ok: true };
    },
    [session.tableLabel, applyDbConnectionFromError, refetchTablesFromDb],
  );

  /** 厨房：口頭注文を任意の卓へ追加（status で未提供キュー／提供済伝票を選択） */
  const addStaffOrdersForTable = useCallback(
    async (tableLabel, rows, options = {}) => {
      const lbl = normalizeTableLabelKey(String(tableLabel ?? ''));
      if (!lbl || !Array.isArray(rows) || rows.length === 0) return { ok: true };
      const status = options.status === 'served' ? 'served' : 'pending';
      const defaultNh = !!options.isNomihodai;
      const t = Date.now();
      const inserts = [];
      rows.forEach((r, idx) => {
        const qty = Math.max(1, Math.floor(Number(r.qty) || 1));
        const priceYen = normalizeItemPriceYen(r.itemPrice ?? r.price);
        const inNhPlan = r.isNomihodai != null ? !!r.isNomihodai : defaultNh;
        for (let q = 0; q < qty; q += 1) {
          inserts.push({
            id: `ord-staff-${t}-${idx}-${q}-${Math.random().toString(36).slice(2, 7)}`,
            table_label: lbl,
            item_id: r.itemId || `staff-${lbl}-${t}-${idx}-${q}`,
            item_name: String(r.itemName || '品名未設定').trim() || '品名未設定',
            item_price: inNhPlan && (r.kind === 'drink' || r.nhPlanFree) ? 0 : priceYen,
            status,
            is_nomihodai: inNhPlan,
            created_at: t + idx * 20 + q,
          });
        }
      });
      if (!inserts.length) return { ok: true };
      ordersRecentOptimisticRef.current = Date.now();
      setDbOrders((prev) => [...prev, ...inserts]);
      const { error } = await supabase.from('beifutei_orders').insert(inserts);
      if (error) {
        pushKitchenDiagFromSupabase('beifutei_orders:insert', error, '厨房口頭INSERT');
        setDbOrders((prev) => prev.filter((o) => !inserts.some((i) => i.id === o.id)));
        return { ok: false, errorMessage: error.message || String(error) };
      }
      return { ok: true, count: inserts.length };
    },
    [],
  );

  const startNomihodai = useCallback(async ({ tableLabel, menCount, womenCount, durationMs = NOMIHODAI_BASE_MS }) => {
    const lbl = normalizeTableLabelKey(tableLabel != null ? String(tableLabel) : String(session.tableLabel));
    if (!lbl) return;
    const men = Math.max(0, Number(menCount) || 0);
    const women = Math.max(0, Number(womenCount) || 0);
    const people = Math.max(1, men + women || 1);
    const billTotal = men * NOMIHODAI_PRICE_MEN + women * NOMIHODAI_PRICE_WOMEN || people * NOMIHODAI_PRICE_MEN;
    const startMs = Date.now();
    const endMs = startMs + durationMs;
    
    // Optimistic
    setDbTables(prev => {
      const copy = [...prev];
      const idx = copy.findIndex((t) => normalizeTableLabelKey(t.table_label ?? '') === lbl);
      const newRow = {
        table_label: lbl,
        nomihodai_active: true,
        nomihodai_start_ms: startMs,
        nomihodai_end_ms: endMs,
        nomihodai_people: people,
        nomihodai_men: men,
        nomihodai_women: women,
        nomihodai_bill_total: billTotal,
        nomihodai_extension_count: 0,
        guest_intent_requested_at: null,
      };
      if (idx >= 0) copy[idx] = { ...copy[idx], ...newRow };
      else copy.push(newRow);
      return normalizeTableStatesRows(copy);
    });

    await supabase.from('beifutei_table_states').upsert({
      table_label: lbl,
      nomihodai_active: true,
      nomihodai_start_ms: startMs,
      nomihodai_end_ms: endMs,
      nomihodai_people: people,
      nomihodai_men: men,
      nomihodai_women: women,
      nomihodai_bill_total: billTotal,
      nomihodai_extension_count: 0,
      guest_intent_requested_at: null, // clear intent
    });
    await patchGuestFarewellColumns(supabase, lbl, null);
  }, [session.tableLabel]);

  const endNomihodai = useCallback(async (tableLabel) => {
    const lbl = tableLabel != null ? String(tableLabel) : String(session.tableLabel);
    
    // Clear it
    await supabase.from('beifutei_table_states').update({
      nomihodai_active: false,
      checkout_requested_at: null,
    }).eq('table_label', lbl);
    await patchGuestFarewellColumns(supabase, lbl, null);

    // Delete pending nomihodai orders
    await supabase.from('beifutei_orders').delete().match({ table_label: lbl, is_nomihodai: true });
  }, [session.tableLabel]);

  const requestTableCheckout = useCallback(async () => {
    const lbl = String(session.tableLabel ?? '').trim();
    return setCheckoutRequestedAtForTable(supabase, lbl, Date.now());
  }, [session.tableLabel]);

  const requestGuestCheckout = useCallback(async () => {
    const lbl = String(session.tableLabel ?? '').trim();
    return setCheckoutRequestedAtForTable(supabase, lbl, Date.now());
  }, [session.tableLabel]);

  const clearCheckoutRequestForTable = useCallback(async (tableLabel) => {
    const lbl = String(tableLabel);
    await supabase.from('beifutei_table_states').update({ checkout_requested_at: null }).eq('table_label', lbl);
  }, []);

  const clearTableCheckoutRequest = useCallback(async () => {
    await clearCheckoutRequestForTable(String(session.tableLabel));
  }, [clearCheckoutRequestForTable, session.tableLabel]);

  const setTableMemo = useCallback(async (tableLabel, memoText) => {
    const lbl = String(tableLabel ?? session.tableLabel);
    const m = String(memoText ?? '').replace(/\s+/g, ' ').trim().slice(0, TABLE_MEMO_MAX_LEN);
    await supabase.from('beifutei_table_states').upsert({ table_label: lbl, table_memo: m });
  }, [session.tableLabel]);

  /** 卓チャージ（人数×1名あたり円・税込）。金額は店舗任意。DB は upsert で反映 */
  const setTableAlcoholCharge = useCallback(
    async (tableLabel, { people, yenPerPerson }) => {
      const lbl = normalizeTableLabelKey(tableLabel ?? '');
      if (!lbl) return;

      const pe = Math.max(0, Math.min(99, Number(people) || 0));
      const yRaw = Number(yenPerPerson);
      const ypp = Number.isFinite(yRaw) ? Math.max(0, Math.min(999999, Math.floor(yRaw))) : 0;

      setDbTables((prev) => {
        const idx = prev.findIndex((t) => normalizeTableLabelKey(t.table_label ?? '') === lbl);
        const patch = {
          alcohol_charge_people: pe,
          alcohol_charge_yen_per_person: ypp,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...patch };
          return normalizeTableStatesRows(next);
        }
        return normalizeTableStatesRows([
          ...prev,
          {
            table_label: lbl,
            ...patch,
            nomihodai_active: false,
            nomihodai_start_ms: null,
            nomihodai_end_ms: null,
            nomihodai_people: 0,
            nomihodai_men: 0,
            nomihodai_women: 0,
            nomihodai_bill_total: 0,
            nomihodai_extension_count: 0,
            guest_intent_requested_at: null,
            checkout_requested_at: null,
            table_memo: null,
          },
        ]);
      });

      const { data, error } = await supabase
        .from('beifutei_table_states')
        .upsert(
          {
            table_label: lbl,
            alcohol_charge_people: pe,
            alcohol_charge_yen_per_person: ypp,
          },
          { onConflict: 'table_label', defaultToNull: false },
        )
        .select('table_label, alcohol_charge_people, alcohol_charge_yen_per_person')
        .maybeSingle();

      if (error) {
        pushKitchenDiagFromSupabase('beifutei_table_states:upsert', error, '卓チャージupsert');
      } else if (data) {
        const key = normalizeTableLabelKey(data.table_label ?? lbl);
        const peDb = Math.max(0, Math.min(99, Number(data.alcohol_charge_people) || 0));
        const yppDb = Math.max(0, Math.min(999999, Math.floor(Number(data.alcohol_charge_yen_per_person) || 0)));
        setDbTables((prev) => {
          const idx = prev.findIndex((t) => normalizeTableLabelKey(t.table_label ?? '') === key);
          const patch = {
            table_label: key,
            alcohol_charge_people: peDb,
            alcohol_charge_yen_per_person: yppDb,
          };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return normalizeTableStatesRows(next);
          }
          return normalizeTableStatesRows([
            ...prev,
            {
              ...patch,
              nomihodai_active: false,
              nomihodai_start_ms: null,
              nomihodai_end_ms: null,
              nomihodai_people: 0,
              nomihodai_men: 0,
              nomihodai_women: 0,
              nomihodai_bill_total: 0,
              nomihodai_extension_count: 0,
              guest_intent_requested_at: null,
              checkout_requested_at: null,
              table_memo: null,
            },
          ]);
        });
      }
      void refetchTablesFromDb();
    },
    [refetchTablesFromDb],
  );

  const requestNomihodaiGuestIntent = useCallback(async () => {
    const lbl = String(session.tableLabel);
    await supabase.from('beifutei_table_states').upsert({ table_label: lbl, guest_intent_requested_at: Date.now() });
  }, [session.tableLabel]);

  const clearNomihodaiGuestIntent = useCallback(async (tableLabel) => {
    if (tableLabel != null) {
      await supabase.from('beifutei_table_states').upsert({ table_label: String(tableLabel), guest_intent_requested_at: null });
    } else {
      // Clear all - edge case, maybe we don't need this exactly
      dbTables.forEach(t => {
        if (t.guest_intent_requested_at) {
          supabase.from('beifutei_table_states').update({ guest_intent_requested_at: null }).eq('table_label', t.table_label);
        }
      });
    }
  }, [dbTables]);

  const extendNomihodai = useCallback(async (extraMs = NOMIHODAI_EXTENSION_MS, tableLabel) => {
    const lbl = tableLabel != null ? String(tableLabel) : String(session.tableLabel);
    const n = session.nomihodaiByLabel[lbl];
    if (!n?.active) return;
    const endMs = n.endMs + extraMs;
    const billTotal = Math.max(0, Number(n.billTotal) || 0) + NOMIHODAI_EXTENSION_PRICE_YEN;
    const extCount = Math.max(0, Number(n.extensionCount) || 0) + 1;
    await supabase.from('beifutei_table_states').update({
      nomihodai_end_ms: endMs,
      nomihodai_bill_total: billTotal,
      nomihodai_extension_count: extCount
    }).eq('table_label', lbl);
  }, [session.tableLabel, session.nomihodaiByLabel]);

  const addNomihodaiOrder = useCallback(async ({ itemId, itemName, itemPrice }) => {
    const lbl = String(session.tableLabel);
    const n = session.nomihodaiByLabel[lbl];
    if (!n?.active) return;
    const id = `nh-ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = {
      id,
      table_label: lbl,
      item_id: itemId,
      item_name: itemName,
      item_price: normalizeItemPriceYen(itemPrice),
      status: 'pending',
      is_nomihodai: true,
      created_at: Date.now(),
    };
    ordersRecentOptimisticRef.current = Date.now();
    setDbOrders((prev) => [...prev, row]);
    const { error } = await supabase.from('beifutei_orders').insert([row]);
    if (error) {
      pushKitchenDiagFromSupabase('beifutei_orders:insert', error, '飲み放題内注文INSERT');
      setDbOrders((prev) => prev.filter((o) => o.id !== id));
    }
  }, [session.tableLabel, session.nomihodaiByLabel]);

  const cancelNomihodaiOrder = useCallback(async (orderId) => {
    await supabase.from('beifutei_orders').delete().match({ id: orderId, is_nomihodai: true, status: 'pending' });
  }, []);

  const markOrderServed = useCallback(async (orderId) => {
    await supabase.from('beifutei_orders').update({ status: 'served' }).eq('id', orderId);
  }, []);

  /** 厨房：口頭注文の訂正など。客席の isNomihodai もここで上書き可能 */
  const setOrderIsNomihodai = useCallback(async (orderId, isNomihodai) => {
    const v = !!isNomihodai;
    setDbOrders((prev) => prev.map((row) => (row.id === orderId ? { ...row, is_nomihodai: v } : row)));
    await supabase.from('beifutei_orders').update({ is_nomihodai: v }).eq('id', orderId);
  }, []);

  const markPendingServedForTable = useCallback(async (tableId, tableLabel) => {
    const tl = String(tableLabel ?? session.tableLabel);
    await supabase.from('beifutei_orders').update({ status: 'served' }).match({ table_label: tl, status: 'pending' });
  }, [session.tableLabel]);

  const finalizeSlipCheckout = useCallback(async ({ tableId, tableLabel, payment }) => {
    const tl = normalizeTableLabelKey(String(tableLabel ?? session.tableLabel)) || '3';
    const pay =
      payment === 'card_5pct' || payment === 'card-5pct'
        ? 'card_5pct'
        : payment === 'card'
          ? 'card'
          : 'cash';

    // Gather data
    const tableOrders = session.orders.filter(o => o.status === 'served' && normalizeTableLabelKey(String(o.tableLabel ?? '')) === tl);
    let normalSubtotal = 0;
    let normalCount = 0;
    let nomihodaiCount = 0;
    const lines = [];

    tableOrders.forEach(o => {
      const itemId = String(o.itemId ?? '');
      const p = Math.max(0, Number(o.itemPrice) || 0);
      if (o.isNomihodai) {
        nomihodaiCount++;
        if (p > 0) {
          normalSubtotal += p;
          lines.push({ kind: 'nh_extra', name: o.itemName, price: p, itemId });
        } else {
          lines.push({ kind: 'nh', name: o.itemName, itemId });
        }
      } else {
        normalCount++;
        normalSubtotal += p;
        lines.push({ kind: 'normal', name: o.itemName, price: p, itemId });
      }
    });

    const n = session.nomihodaiByLabel[tl];
    const nomihodaiPlanYen = n?.active ? Math.max(0, Number(n.billTotal) || 0) : 0;
    const ac = getAlcoholTableCharge(session, tl);
    if (ac.totalYen > 0) {
      lines.push({ kind: 'alcohol_charge', name: ac.lineName, price: ac.totalYen });
    }
    const baseTotal = normalSubtotal + nomihodaiPlanYen + ac.totalYen;
    const total = pay === 'card_5pct' ? Math.ceil(baseTotal * 1.05) : baseTotal;

    const hasSlipBody =
      normalCount > 0 || nomihodaiCount > 0 || nomihodaiPlanYen > 0 || ac.totalYen > 0;
    if (!hasSlipBody) return { ok: false, reason: 'empty_slip' };

    const checkoutNow = Date.now();
    const stayMinutes = nomihodaiPlanYen > 0 && n?.startMs ? Math.max(0, Math.round((checkoutNow - n.startMs) / 60000)) : null;
    const rawMemo = session.tableMemoByLabel[tl];
    const checkoutMemo = typeof rawMemo === 'string' ? rawMemo.replace(/\s+/g, ' ').trim().slice(0, TABLE_MEMO_MAX_LEN) : '';
    const party =
      session.guestPartyByLabel?.[tl] ?? loadGuestPartyLocalAll()[tl] ?? null;

    appendDailyLedgerEntry({
      recordedAt: checkoutNow,
      tableKey: `default::${tl}`,
      tableLabel: tl,
      payment: pay,
      total,
      normalSubtotal,
      nomihodaiPlanYen,
      alcoholChargeYen: ac.totalYen,
      normalCount,
      nomihodaiCount,
      lines,
      hadNomihodaiCheckout: nomihodaiPlanYen > 0,
      nhStartMs: nomihodaiPlanYen > 0 && n ? n.startMs : null,
      nhEndMsAtCheckout: nomihodaiPlanYen > 0 && n ? n.endMs : null,
      extensionCount: nomihodaiPlanYen > 0 && n ? Math.max(0, Number(n.extensionCount) || 0) : 0,
      menCount: nomihodaiPlanYen > 0 && n ? Math.max(0, Number(n.menCount) || 0) : 0,
      womenCount: nomihodaiPlanYen > 0 && n ? Math.max(0, Number(n.womenCount) || 0) : 0,
      people: nomihodaiPlanYen > 0 && n ? Math.max(1, Number(n.people) || 1) : 1,
      stayMinutes,
      checkoutMemo,
      partyMen: party?.men ?? 0,
      partyWomen: party?.women ?? 0,
      partyChildren: party?.children ?? 0,
      guestUiLocale: party?.locale === 'en' ? 'en' : party?.locale === 'ja' ? 'ja' : undefined,
      orderSource: 'table',
    });

    // Cleanup Supabase
    // 1. Delete served orders for this table
    const orderIds = tableOrders.map(o => o.id);
    if (orderIds.length > 0) {
      await supabase.from('beifutei_orders').delete().in('id', orderIds);
    }

    // 2. 未提供の飲み放題注文を削除（卓に残ると NH が続いているように見える）
    await supabase
      .from('beifutei_orders')
      .delete()
      .eq('table_label', tl)
      .eq('is_nomihodai', true)
      .eq('status', 'pending');

    // 3. 卓状態を確実にリセット（update だけだと行が無い／DBエラーで NH が止まらないことがある → upsert）
    const payloadFull = checkoutTableResetPayload(tl);
    let { error: tblErr } = await supabase.from('beifutei_table_states').upsert(payloadFull);
    if (tblErr) {
      const { alcohol_charge_people, alcohol_charge_yen_per_person, ...payloadNoAlc } = payloadFull;
      const retry = await supabase.from('beifutei_table_states').upsert(payloadNoAlc);
      tblErr = retry.error;
    }
    if (tblErr) {
      pushKitchenDiagFromSupabase('beifutei_table_states:upsert', tblErr, '会計後卓リセット');
    }

    setDbTables((prev) => {
      const idx = prev.findIndex((r) => normalizeTableLabelKey(r.table_label ?? '') === tl);
      const merged = checkoutTableResetPayload(tl);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...merged };
        return normalizeTableStatesRows(next);
      }
      return normalizeTableStatesRows([...prev, merged]);
    });
    void refetchTablesFromDb();
    clearGuestPartyLocal(tl);

    const cqRaw = session.checkoutRequestByLabel?.[tl];
    const cqNum = Number(cqRaw);
    const fromCheckoutReq = Number.isFinite(cqNum) && cqNum > 0 ? cqNum : null;
    const gcRaw = n?.guestCheckoutRequestedAt != null ? Number(n.guestCheckoutRequestedAt) : null;
    const fromNhGuest = Number.isFinite(gcRaw) && gcRaw > 0 ? gcRaw : null;
    const farewellRequestedAt = fromCheckoutReq ?? fromNhGuest ?? checkoutNow;

    await patchGuestFarewellColumns(supabase, tl, {
      requestedAt: farewellRequestedAt,
      completedAt: checkoutNow,
    });

    if (String(tl).trim() === String(session.tableLabel ?? '').trim()) {
      saveLocalDeviceState((s) => ({
        ...s,
        nomihodaiFarewell: {
          checkoutRequestedAt: farewellRequestedAt,
          checkoutCompletedAt: checkoutNow,
        },
      }));
    }

    return { ok: true };
  }, [
    session.tableLabel,
    session.orders,
    session.nomihodaiByLabel,
    session.checkoutRequestByLabel,
    session.tableMemoByLabel,
    session.alcoholChargeByLabel,
    saveLocalDeviceState,
    localDeviceState.tableLabel,
    setDbTables,
    refetchTablesFromDb,
  ]);

  /** バッシング完了：卓タブレットの退席メッセージを消し、飲み放題タブを再利用可能にする */
  const clearGuestFarewellForReuse = useCallback(
    async (tableLabel) => {
      const tl = String(tableLabel != null ? tableLabel : session.tableLabel).trim();
      await patchGuestFarewellColumns(supabase, tl, null);
      if (tl === String(session.tableLabel ?? '').trim()) {
        saveLocalDeviceState((s) => ({ ...s, nomihodaiFarewell: null }));
      }
    },
    [session.tableLabel, localDeviceState.tableLabel, saveLocalDeviceState]
  );

  /** 会計完了後も Realtime 遅れで NH が残るのを防ぐ（farewell 確定時は帯・ロックを消す） */
  const nomihodaiActive = useMemo(() => {
    const lbl = normalizeTableLabelKey(session.tableLabel ?? '') || '3';
    const myRow = dbTables.find((r) => normalizeTableLabelKey(r.table_label ?? '') === lbl);
    const farewellCompleted =
      !!farewellFromTableRow(myRow) ||
      (!!session.nomihodaiFarewell &&
        Number.isFinite(Number(session.nomihodaiFarewell.checkoutCompletedAt)) &&
        Number(session.nomihodaiFarewell.checkoutCompletedAt) > 0);
    if (farewellCompleted) return false;
    return !!getNomihodaiForTable(session, lbl)?.active;
  }, [session, dbTables]);

  const n = getNomihodaiForTable(session, session.tableLabel);

  const countdown = useMemo(() => {
    if (!n?.active) {
      return { endMin: null, extendMin: null, loMin: null, loPhase: false, ended: true };
    }
    const endLeft = Math.max(0, n.endMs - now);
    const nextExtendMs =
      Number.isFinite(n.nextAutoExtendMs) && n.nextAutoExtendMs > n.startMs
        ? n.nextAutoExtendMs
        : n.endMs;
    const extendLeft = Math.max(0, nextExtendMs - now);
    const loLeft = Math.max(0, n.lastOrderMs - now);
    return {
      endMin: Math.ceil(endLeft / 60000),
      extendMin: Math.ceil(extendLeft / 60000),
      loMin: Math.ceil(loLeft / 60000),
      loPhase: now >= n.lastOrderMs,
      ended: now >= n.endMs,
    };
  }, [n, now]);

  const pendingNomihodaiCount = useMemo(() => {
    const lbl = String(session.tableLabel || '3');
    return session.orders.filter(
      (o) =>
        o.isNomihodai &&
        o.status === 'pending' &&
        String(o.tableLabel ?? '3') === lbl
    ).length;
  }, [session.orders, session.tableLabel]);

  const canOrderMoreNomihodai = useMemo(() => {
    if (!n?.active) return false;
    if (!NOMIHODAI_PENDING_QUEUE_LIMIT_ENABLED) return true;
    return pendingNomihodaiCount < n.people;
  }, [n, pendingNomihodaiCount]);

  const guestNomihodaiIntentPending = useMemo(() => {
    const lbl = String(session.tableLabel || '3');
    const intent = getGuestIntentForTable(session, lbl);
    const nh = getNomihodaiForTable(session, lbl);
    return !!(intent && !nh?.active);
  }, [session.tableLabel, session.nomihodaiGuestIntentByLabel, session.nomihodaiByLabel]);

  const guestNomihodaiIntentLabels = useMemo(
    () => listGuestIntentTableLabels(session),
    [session.nomihodaiGuestIntentByLabel]
  );

  const activeNomihodaiTableCount = useMemo(
    () => countActiveNomihodaiTables(session),
    [session.nomihodaiByLabel]
  );

  const value = useMemo(
    () => ({
      session,
      now,
      dbConnection,
      setSession: () => {}, // Deprecated but kept for surface compatibility
      refresh: () => {}, // Handled by realtime
      fullResyncDbFromSupabase,
      startNomihodai,
      endNomihodai,
      extendNomihodai,
      addNomihodaiOrder,
      cancelNomihodaiOrder,
      markOrderServed,
      setOrderIsNomihodai,
      markPendingServedForTable,
      requestNomihodaiGuestIntent,
      clearNomihodaiGuestIntent,
      setSessionTableLabel,
      submitGuestPartyDemographics,
      setTableMemo,
      setTableAlcoholCharge,
      requestGuestCheckout,
      addGuestOrders,
      addStaffOrdersForTable,
      requestTableCheckout,
      clearCheckoutRequestForTable,
      clearTableCheckoutRequest,
      finalizeSlipCheckout,
      clearGuestFarewellForReuse,
      nomihodaiActive,
      guestNomihodaiIntentPending,
      guestNomihodaiIntentLabels,
      activeNomihodaiTableCount,
      countdown,
      pendingNomihodaiCount,
      canOrderMoreNomihodai,
      prices: { men: NOMIHODAI_PRICE_MEN, women: NOMIHODAI_PRICE_WOMEN },
      nomihodaiPlan: {
        baseMinutes: NOMIHODAI_BASE_MINUTES,
        extensionMinutes: NOMIHODAI_EXTENSION_MINUTES,
        extensionPriceYen: NOMIHODAI_EXTENSION_PRICE_YEN,
      },
    }),
    [
      session,
      now,
      dbConnection,
      fullResyncDbFromSupabase,
      startNomihodai,
      endNomihodai,
      extendNomihodai,
      addNomihodaiOrder,
      cancelNomihodaiOrder,
      markOrderServed,
      setOrderIsNomihodai,
      markPendingServedForTable,
      requestNomihodaiGuestIntent,
      clearNomihodaiGuestIntent,
      setSessionTableLabel,
      submitGuestPartyDemographics,
      setTableMemo,
      setTableAlcoholCharge,
      requestGuestCheckout,
      addGuestOrders,
      addStaffOrdersForTable,
      requestTableCheckout,
      clearCheckoutRequestForTable,
      clearTableCheckoutRequest,
      finalizeSlipCheckout,
      clearGuestFarewellForReuse,
      nomihodaiActive,
      guestNomihodaiIntentPending,
      guestNomihodaiIntentLabels,
      activeNomihodaiTableCount,
      countdown,
      pendingNomihodaiCount,
      canOrderMoreNomihodai,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNomihodaiSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNomihodaiSession requires NomihodaiSessionProvider');
  return v;
}
