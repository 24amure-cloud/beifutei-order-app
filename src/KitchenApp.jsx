import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAlcoholTableCharge } from './alcoholTableCharge.js';
import { formatLedgerPaymentJa, getLocalDateKey, loadDailyLedger } from './dailyLedger.js';
import { NOMIHODAI_EXTENSION_PRICE_YEN } from './nomihodaiConstants.js';
import {
  collectKnownTableLabels,
  getNomihodaiForTable,
  mergeTableLabelLists,
  normalizeTableLabelKey,
  TABLE_MEMO_MAX_LEN,
} from './nomihodaiSession.js';
import { readGuestTableLabelFromUrl } from './guestOrderUrl.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import TableMemoRibbon from './TableMemoRibbon.jsx';
import { KitchenStaffRetailHub } from './KitchenRetailMenus.jsx';
import TakeoutSweetsStockPanel from './TakeoutSweetsStockPanel.jsx';
import DrinkSpotPanel from './DrinkSpotPanel.jsx';
import { KitchenDiagnosticsFooter, KitchenRealtimeBadge } from './KitchenStaffDiagnostics.jsx';
import { isSupabaseConfigured } from './supabaseClient.js';
import SupabaseConfigMissingScreen from './SupabaseConfigMissingScreen.jsx';
import SupabaseConnectionBanner from './SupabaseConnectionBanner.jsx';
import StoreEntryUrlsPanel from './StoreEntryUrlsPanel.jsx';
import KitchenVerbalOrderSheet from './KitchenVerbalOrderSheet.jsx';
import KitchenCheckoutModal from './KitchenCheckoutModal.jsx';
import KitchenSwipeDeleteRow from './KitchenSwipeDeleteRow.jsx';
import LedgerEntryDeleteButton from './LedgerEntryDeleteButton.jsx';
import LedgerEntryEditDateButton from './LedgerEntryEditDateButton.jsx';
import {
  buildLedgerReceiptPayload,
  buildSampleReceiptPayload,
  buildSlipReceiptPayload,
  canUsePassPrnt,
  printReceiptWithFeedback,
} from './receiptPrint.js';
import KitchenReceiptPreviewButton from './KitchenReceiptPreviewButton.jsx';
import KitchenSlipBoard from './KitchenSlipBoard.jsx';
import { PwaTableRibbon } from './PwaTableUi.jsx';
import { computeTableHistoryTotals, resolveSlipBundleForTableLabel } from './kitchenSlipBundle.js';
import {
  isNomihodaiChargedExtra,
  nhToggleShowsNomihodaiActive,
  orderKindMeta,
  orderLineSlipMetaPrice,
  orderLineTaxInLabel,
} from './kitchenOrderDisplay.js';

function fmtTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

/** 新規未提供注文で鳴らす短いアラート（AudioContext はユーザー操作後に解放されやすい） */
function playKitchenNewOrderAlert() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const beep = (when, freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, when);
      g.gain.setValueAtTime(0.001, when);
      g.gain.exponentialRampToValueAtTime(0.12, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.17);
    };
    const t0 = ctx.currentTime + 0.04;
    beep(t0, 784);
    beep(t0 + 0.2, 988);
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    }, 900);
  } catch {
    /* ignore */
  }
}

/** 客席から飲み放題希望が届いたとき（新規卓のみ・初回ロードでは鳴らさない） */
function playKitchenNomihodaiIntentAlert() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const beep = (when, freq, dur = 0.22) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, when);
      g.gain.setValueAtTime(0.001, when);
      g.gain.exponentialRampToValueAtTime(0.18, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + dur + 0.02);
    };
    const t0 = ctx.currentTime + 0.03;
    beep(t0, 523);
    beep(t0 + 0.16, 659);
    beep(t0 + 0.32, 784);
    beep(t0 + 0.48, 988);
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    }, 1200);
  } catch {
    /* ignore */
  }
}

function orderKitchenEmoji(o) {
  return orderKindMeta(o).emoji;
}

/**
 * 未提供ライブ帯の「フード」判定。それ以外（飲み放題・ドリンク・カフェ飲料・サイドのお酒など）は飲み物。
 * itemId 規約は客席 App.jsx の addToCart に合わせる。
 */
function pendingKitchenOrderIsFood(o) {
  if (o.isNomihodai) return false;
  const id = String(o.itemId || '');
  if (/^sd-drink-/i.test(id)) return false;
  if (/^abu:/i.test(id)) return true;
  if (/^pz-/i.test(id)) return true;
  if (/^top-/i.test(id)) return true;
  if (/^ts-/i.test(id)) return true;
  if (/^sd-/i.test(id)) return true;
  if (/^fr-/i.test(id)) return true;
  const line = String(o.itemName || '').split('\n')[0];
  if (/油そば|米風亭|辛々|担々|ネギ盛り/.test(line)) return true;
  if (/ピッツァ|ピザ|マルゲリタ|ジェノヴェーゼ|ビスマルク|クワトロフォルマッジ/i.test(line)) return true;
  return false;
}

/** 同一テーブルで created_at が近い行を「1回の送信」＝1ヒーローにまとめる */
const PENDING_ORDER_BATCH_GAP_MS = 2500;

function groupPendingOrderBatches(sortedOldestFirst) {
  const list = sortedOldestFirst;
  const raw = [];
  let cur = null;
  for (const o of list) {
    const lbl = String(o.tableLabel ?? '3');
    const t = Number(o.createdAt) || 0;
    if (!cur || cur.tableLabel !== lbl || t - cur.lastT > PENDING_ORDER_BATCH_GAP_MS) {
      if (cur) raw.push(cur);
      cur = {
        tableLabel: lbl,
        tableId: o.tableId || 'default',
        orders: [o],
        anchorT: t,
        lastT: t,
      };
    } else {
      cur.orders.push(o);
      cur.lastT = Math.max(cur.lastT, t);
    }
  }
  if (cur) raw.push(cur);

  return raw.map((b, i) => {
    const prev = i > 0 ? raw[i - 1] : null;
    const continuesPrevBatch = prev != null && prev.tableLabel === b.tableLabel;
    let afterOtherTables = false;
    let prevSameIdx = -1;
    for (let j = i - 1; j >= 0; j -= 1) {
      if (raw[j].tableLabel === b.tableLabel) {
        prevSameIdx = j;
        break;
      }
    }
    if (prevSameIdx >= 0) {
      for (let k = prevSameIdx + 1; k < i; k += 1) {
        if (raw[k].tableLabel !== b.tableLabel) {
          afterOtherTables = true;
          break;
        }
      }
    }
    return {
      ...b,
      key: `${b.tableLabel}-${b.orders[0]?.id ?? i}`,
      queuePos: i + 1,
      continuesPrevBatch,
      afterOtherTables,
    };
  });
}

function batchHeroEmoji(orders) {
  for (const o of orders) {
    if (pendingKitchenOrderIsFood(o)) return '🍜';
  }
  const first = orders[0];
  return first ? orderKitchenEmoji(first) : '🍽️';
}

const STAFF_TABS = {
  orders: 'orders',
  /** 卓の状態・飲み放題操作＋伝票（提供済）・会計 */
  tableStatus: 'table-status',
  /** 本日・会計確定済み伝票のログ（スタッフ用） */
  checkoutDone: 'checkout-done',
  /** カフェ／ソフトクリーム／テイクアウト（客席UI複製・手元注文） */
  retailTakeout: 'retail-takeout',
  /** テイクアウトスイーツ在庫（会計・注文と分離） */
  sweetsStock: 'sweets-stock',
  /** ドリンク・スポット品の客席表示 ON/OFF */
  drinkSpot: 'drink-spot',
};

/** 厨房：注文行の会計区分（客席の注文区分を反映。口頭等の訂正可） */
function OrderBillingToggle({ orderId, isNomihodai, onSetNomihodai, compact }) {
  return (
    <div
      className={`kitchen-order-nh-toggle${compact ? ' kitchen-order-nh-toggle--compact' : ''}`}
      role="group"
      aria-label="会計区分（飲み放題／通常）"
    >
      <button
        type="button"
        className={`kitchen-order-nh-toggle__btn${isNomihodai ? ' is-active' : ''}`}
        onClick={() => onSetNomihodai(orderId, true)}
      >
        飲み放題
      </button>
      <button
        type="button"
        className={`kitchen-order-nh-toggle__btn${!isNomihodai ? ' is-active' : ''}`}
        onClick={() => onSetNomihodai(orderId, false)}
      >
        通常
      </button>
    </div>
  );
}

const TABLE_HERO_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function buildInitialNhForm() {
  return Object.fromEntries(TABLE_HERO_LABELS.map((l) => [l, { men: 1, women: 1 }]));
}

export default function KitchenApp() {
  const {
    session,
    startNomihodai,
    endNomihodai,
    markOrderServed,
    removeKitchenOrder,
    setOrderIsNomihodai,
    markPendingServedForTable,
    guestNomihodaiIntentLabels,
    clearNomihodaiGuestIntent,
    setSessionTableLabel,
    now,
    prices,
    clearCheckoutRequestForTable,
    finalizeSlipCheckout,
    clearGuestFarewellForReuse,
    setTableMemo,
    setTableAlcoholCharge,
  } = useNomihodaiSession();

  const [nhForm, setNhForm] = useState(buildInitialNhForm);
  /** 会計ページ（依頼卓の確認〜支払い3択） */
  const [checkoutPage, setCheckoutPage] = useState(null);
  const [checkoutPickerOpen, setCheckoutPickerOpen] = useState(false);
  const [tableDetailLabel, setTableDetailLabel] = useState(null);
  const [staffTab, setStaffTab] = useState(STAFF_TABS.orders);
  const [ledgerRevision, setLedgerRevision] = useState(0);
  /** 各卓カードで「飲み放題・卓操作」パネルを開いている卓（1枚だけ） */
  const [tableNhOpsOpen, setTableNhOpsOpen] = useState(null);
  /** 伝票ボードで詳細表示中の卓 */
  const [slipBoardSelectedLabel, setSlipBoardSelectedLabel] = useState('1');
  /** 口頭注文シート（卓番 or null=閉） */
  const [verbalOrderTable, setVerbalOrderTable] = useState(null);
  const ordersHubRef = useRef(null);
  const pendingIdsForSoundRef = useRef(null);
  const nhIntentLabelsForSoundRef = useRef(null);

  const goToOrdersTab = useCallback(() => {
    setStaffTab(STAFF_TABS.orders);
    window.requestAnimationFrame(() => {
      ordersHubRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const goToTableStatusTab = useCallback(() => {
    setStaffTab(STAFF_TABS.tableStatus);
  }, []);

  useEffect(() => {
    const fromUrl = readGuestTableLabelFromUrl();
    if (fromUrl) setSessionTableLabel(fromUrl);
  }, [setSessionTableLabel]);

  /** 飲み放題希望サイン等から「各卓・伝票」へ。label があれば該当卓の NH 操作パネルを開く */
  const openSlipTabWithNhOps = useCallback(
    (label) => {
      const L = normalizeTableLabelKey(label ?? '');
      setStaffTab(STAFF_TABS.tableStatus);
      setTableNhOpsOpen(L || null);
      if (L) {
        setSessionTableLabel(L);
        setSlipBoardSelectedLabel(L);
      }
    },
    [setSessionTableLabel],
  );

  const handleVerbalOrderSubmitted = useCallback(
    ({ flow }) => {
      if (flow === 'kitchen') {
        setStaffTab(STAFF_TABS.orders);
        goToOrdersTab();
      }
    },
    [goToOrdersTab],
  );

  const allOrders = useMemo(() => session.orders, [session.orders]);

  /** 伝票ボードに出す卓：固定1〜8 ＋ 注文・人数・NH等が付いた卓（URL卓番もここに載る） */
  const slipBoardTableLabels = useMemo(
    () => mergeTableLabelLists(TABLE_HERO_LABELS, collectKnownTableLabels(session)),
    [session],
  );

  /** 全卓共通：createdAt が古いほど先（上） */
  const pendingOrders = useMemo(
    () =>
      allOrders
        .filter((o) => o.status === 'pending')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    [allOrders]
  );

  /** 厨房端末の「操作中卓」（URL / 手動選択 / 未提供キュー先頭） */
  const staffFocusTableLabel = useMemo(() => {
    const fromSession = normalizeTableLabelKey(session.tableLabel ?? '');
    if (fromSession) return fromSession;
    const oldestPending = pendingOrders[0];
    if (oldestPending) return normalizeTableLabelKey(oldestPending.tableLabel) || '';
    if (guestNomihodaiIntentLabels.length > 0) {
      return normalizeTableLabelKey(guestNomihodaiIntentLabels[0]) || '';
    }
    return '';
  }, [session.tableLabel, pendingOrders, guestNomihodaiIntentLabels]);

  useEffect(() => {
    if (normalizeTableLabelKey(session.tableLabel ?? '')) return;
    if (!staffFocusTableLabel) return;
    setSessionTableLabel(staffFocusTableLabel);
  }, [session.tableLabel, staffFocusTableLabel, setSessionTableLabel]);

  useEffect(() => {
    setNhForm((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const label of slipBoardTableLabels) {
        const nh = getNomihodaiForTable(session, label);
        if (!nh?.active) continue;
        const men = Math.max(0, Number(nh.menCount) || 0);
        const women = Math.max(0, Number(nh.womenCount) || 0);
        const cur = prev[label] || { men: 1, women: 1 };
        if (cur.men === men && cur.women === women) continue;
        next[label] = { men, women };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [session.nomihodaiByLabel, slipBoardTableLabels, session]);

  /** 未提供キューに載っている卓に限り、注文一覧から飲み放題希望に応答する */
  const pendingTableLabelsSet = useMemo(
    () => new Set(pendingOrders.map((o) => normalizeTableLabelKey(o.tableLabel) || '3')),
    [pendingOrders]
  );
  const nhIntentQuickFromQueueLabels = useMemo(() => {
    const oldestPendingMs = (lbl) => {
      const L = String(lbl);
      let m = Infinity;
      for (const o of pendingOrders) {
        if (String(o.tableLabel ?? '3') !== L) continue;
        const t = Number(o.createdAt) || 0;
        if (t < m) m = t;
      }
      return Number.isFinite(m) ? m : 0;
    };
    return guestNomihodaiIntentLabels
      .filter((lbl) => {
        const L = String(lbl);
        if (!pendingTableLabelsSet.has(L)) return false;
        if (getNomihodaiForTable(session, L)?.active) return false;
        return true;
      })
      .sort((a, b) => oldestPendingMs(a) - oldestPendingMs(b));
  }, [guestNomihodaiIntentLabels, pendingOrders, pendingTableLabelsSet, session]);
  const nhIntentOutsideQueueLabels = useMemo(
    () => guestNomihodaiIntentLabels.filter((lbl) => !nhIntentQuickFromQueueLabels.includes(String(lbl))),
    [guestNomihodaiIntentLabels, nhIntentQuickFromQueueLabels]
  );

  const handleConfirmStartNomihodai = useCallback(
    async (label) => {
      const menC = Math.max(0, Number(nhForm[label]?.men) || 0);
      const womenC = Math.max(0, Number(nhForm[label]?.women) || 0);
      if (menC + womenC < 1) {
        window.alert('飲み放題を開始するには、男性または女性を1名以上入力してください。');
        return;
      }
      const planYen = menC * prices.men + womenC * prices.women;
      if (
        !window.confirm(
          `卓${label}で飲み放題（90分）を開始しますか？\n\n男性 ${menC} 名・女性 ${womenC} 名\n税込プラン料金：￥${planYen.toLocaleString()}\n\n※間違った卓でないか確認してください。`
        )
      ) {
        return;
      }
      const res = await startNomihodai({
        tableLabel: label,
        menCount: menC,
        womenCount: womenC,
      });
      if (!res || res.ok === false) {
        window.alert(`飲み放題の開始に失敗しました。\n${res?.errorMessage || '通信またはDBを確認してください。'}`);
        return;
      }
      void clearNomihodaiGuestIntent(label);
      setTableNhOpsOpen(null);
    },
    [nhForm, prices, startNomihodai, clearNomihodaiGuestIntent]
  );

  /** 客席オンボーディングで入力された人数を、飲み放題開始フォームへ反映 */
  useEffect(() => {
    setNhForm((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const label of slipBoardTableLabels) {
        const party = session.guestPartyByLabel?.[label];
        if (!(party?.capturedAt > 0)) continue;
        if (getNomihodaiForTable(session, label)?.active) continue;
        let men = Math.max(0, Number(party.men) || 0);
        let women = Math.max(0, Number(party.women) || 0);
        const children = Math.max(0, Number(party.children) || 0);
        if (men + women < 1 && children > 0) women = children;
        if (men + women < 1) continue;
        const cur = prev[label] || { men: 1, women: 1 };
        if (cur.men === men && cur.women === women) continue;
        next[label] = { men, women };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [session.guestPartyByLabel, session.nomihodaiByLabel, slipBoardTableLabels]);

  const alertServeFailed = useCallback((res) => {
    if (!res || res.ok !== false) return;
    window.alert(
      `提供済にできませんでした。\n${res.errorMessage === 'ORDER_NOT_FOUND' ? '注文が見つかりません（再同期を試してください）' : res.errorMessage || '通信またはDBを確認してください'}`,
    );
  }, []);

  const handleMarkServed = useCallback(
    async (orderId) => {
      const res = await markOrderServed(orderId);
      alertServeFailed(res);
    },
    [markOrderServed, alertServeFailed],
  );

  const handleMarkTableServed = useCallback(
    async (tableId, tableLabel) => {
      const res = await markPendingServedForTable(tableId, tableLabel);
      alertServeFailed(res);
    },
    [markPendingServedForTable, alertServeFailed],
  );

  const handleRemoveOrder = useCallback(
    async (order) => {
      const name = orderKindMeta(order).firstLine;
      if (
        !window.confirm(
          `「${name}」を伝票から削除しますか？\n間違えて打った行を取り消します。`,
        )
      ) {
        return;
      }
      const res = await removeKitchenOrder(order.id);
      if (res?.ok === false) {
        window.alert(
          `削除できませんでした。\n${res.errorMessage === 'ORDER_NOT_FOUND' ? '注文が見つかりません（再同期を試してください）' : res.errorMessage || '通信またはDBを確認してください'}`,
        );
      }
    },
    [removeKitchenOrder],
  );

  const serveOrderBatch = useCallback(
    async (orders) => {
      for (const o of orders) {
        const res = await markOrderServed(o.id);
        if (res?.ok === false) {
          alertServeFailed(res);
          return;
        }
      }
    },
    [markOrderServed, alertServeFailed],
  );

  const pendingOrderBatches = useMemo(() => groupPendingOrderBatches(pendingOrders), [pendingOrders]);

  /** 卓ごと一括ボタン用：キューと同様、各卓の最古未提供が先になるよう卓を並べる */
  const pendingBulkTables = useMemo(() => {
    const map = new Map();
    for (const o of pendingOrders) {
      const lbl = normalizeTableLabelKey(o.tableLabel) || '3';
      const tid = o.tableId ?? session.tableId ?? 'default';
      if (!map.has(lbl)) {
        map.set(lbl, { tableLabel: lbl, tableId: tid, oldest: Infinity, count: 0 });
      }
      const row = map.get(lbl);
      row.count += 1;
      const t = Number(o.createdAt) || 0;
      if (t < row.oldest) row.oldest = t;
    }
    return Array.from(map.values()).sort((a, b) => a.oldest - b.oldest);
  }, [pendingOrders, session.tableId, session.tableLabel]);
  const { pendingDrinkCount, pendingFoodCount } = useMemo(() => {
    let food = 0;
    for (const o of pendingOrders) {
      if (pendingKitchenOrderIsFood(o)) food += 1;
    }
    return {
      pendingFoodCount: food,
      pendingDrinkCount: pendingOrders.length - food,
    };
  }, [pendingOrders]);
  const servedOrders = useMemo(
    () => allOrders.filter((o) => o.status === 'served').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [allOrders]
  );
  const ordersByTableLabel = useMemo(() => {
    const map = new Map();
    for (const label of slipBoardTableLabels) {
      map.set(label, []);
    }
    for (const o of allOrders) {
      const lbl = normalizeTableLabelKey(o.tableLabel) || '3';
      if (!map.has(lbl)) map.set(lbl, []);
      map.get(lbl).push(o);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return map;
  }, [allOrders, session.tableLabel, slipBoardTableLabels]);

  const tableDetailTotals = useMemo(() => {
    if (!tableDetailLabel) return null;
    const orders = ordersByTableLabel.get(tableDetailLabel) || [];
    return computeTableHistoryTotals(session, tableDetailLabel, orders);
  }, [tableDetailLabel, ordersByTableLabel, session]);

  const servedByTable = useMemo(() => {
    const map = new Map();
    servedOrders.forEach((o) => {
      const tableId = o.tableId || session.tableId || 'default';
      const tableLabel = normalizeTableLabelKey(o.tableLabel) || '3';
      const key = `${tableId}::${tableLabel}`;
      const current = map.get(key) || {
        key,
        tableId,
        tableLabel,
        orders: [],
        normalSubtotal: 0,
        normalCount: 0,
        nomihodaiCount: 0,
      };
      current.orders.push(o);
      const yen = Math.max(0, Number(o.itemPrice) || 0);
      if (o.isNomihodai) {
        current.nomihodaiCount += 1;
        if (yen > 0) current.normalSubtotal += yen;
      } else {
        current.normalCount += 1;
        current.normalSubtotal += yen;
      }
      map.set(key, current);
    });
    return Array.from(map.values())
      .map((table) => {
        const nhRow = getNomihodaiForTable(session, table.tableLabel);
        const nomihodaiPlanYen = nhRow?.active ? Math.max(0, Number(nhRow.billTotal) || 0) : 0;
        const alcoholChargeYen = getAlcoholTableCharge(session, table.tableLabel).totalYen;
        return {
          ...table,
          nomihodaiPlanYen,
          alcoholChargeYen,
          slipGrandTotal: table.normalSubtotal + nomihodaiPlanYen + alcoholChargeYen,
        };
      })
      .sort((a, b) => Number(a.tableLabel) - Number(b.tableLabel));
  }, [servedOrders, session.tableId, session.tableLabel, session.nomihodaiByLabel, session.alcoholChargeByLabel]);

  const slipBoardPickerMeta = useMemo(() => {
    const meta = new Map();
    for (const label of slipBoardTableLabels) {
      const list = ordersByTableLabel.get(label) || [];
      const pendingN = list.filter((o) => o.status === 'pending').length;
      const nh = getNomihodaiForTable(session, label);
      const slip = resolveSlipBundleForTableLabel(servedByTable, session, label);
      meta.set(label, {
        pendingN,
        slipGrandTotal: slip.slipGrandTotal,
        isNh: !!nh?.active,
        hasCheckoutReq: !!session.checkoutRequestByLabel?.[label],
        intentGuest: guestNomihodaiIntentLabels.includes(String(label)) && !nh?.active,
      });
    }
    return meta;
  }, [
    slipBoardTableLabels,
    ordersByTableLabel,
    servedByTable,
    session,
    guestNomihodaiIntentLabels,
  ]);

  useEffect(() => {
    if (staffTab !== STAFF_TABS.tableStatus) return;
    setSlipBoardSelectedLabel((prev) => {
      if (prev && slipBoardTableLabels.includes(prev)) return prev;
      const focus =
        staffFocusTableLabel && slipBoardTableLabels.includes(staffFocusTableLabel)
          ? staffFocusTableLabel
          : slipBoardTableLabels[0];
      return focus || '1';
    });
  }, [staffTab, staffFocusTableLabel, slipBoardTableLabels]);

  const handleSelectSlipTable = useCallback(
    (label) => {
      const L = normalizeTableLabelKey(label);
      if (!L) return;
      setSlipBoardSelectedLabel(L);
      setSessionTableLabel(L);
    },
    [setSessionTableLabel],
  );

  const checkoutRequestLabels = useMemo(() => {
    const m = session.checkoutRequestByLabel || {};
    return Object.keys(m).sort((a, b) => Number(a) - Number(b));
  }, [session.checkoutRequestByLabel]);
  const hasCheckoutRequests = checkoutRequestLabels.length > 0;

  const openCheckoutRequestFlow = useCallback(() => {
    if (!hasCheckoutRequests) {
      setStaffTab(STAFF_TABS.tableStatus);
      return;
    }
    if (checkoutRequestLabels.length === 1) {
      const lbl = checkoutRequestLabels[0];
      const slip = resolveSlipBundleForTableLabel(servedByTable, session, lbl);
      setSlipBoardSelectedLabel(lbl);
      setCheckoutPage({ tableLabel: slip.tableLabel, tableId: slip.tableId });
      setStaffTab(STAFF_TABS.tableStatus);
      return;
    }
    setCheckoutPickerOpen(true);
  }, [checkoutRequestLabels, hasCheckoutRequests, servedByTable, session]);

  const checkoutSlip = useMemo(() => {
    if (!checkoutPage?.tableLabel) return null;
    return resolveSlipBundleForTableLabel(servedByTable, session, checkoutPage.tableLabel);
  }, [checkoutPage, servedByTable, session]);

  const checkoutPendingCount = useMemo(() => {
    if (!checkoutPage?.tableLabel) return 0;
    const tl = String(checkoutPage.tableLabel);
    return pendingOrders.filter((o) => normalizeTableLabelKey(o.tableLabel) === tl).length;
  }, [checkoutPage, pendingOrders, session.tableLabel]);

  const checkoutPageMemo = useMemo(() => {
    if (!checkoutPage?.tableLabel) return '';
    const raw = session.tableMemoByLabel?.[checkoutPage.tableLabel];
    return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  }, [checkoutPage, session.tableMemoByLabel]);

  const finalizeCheckoutPayment = useCallback(
    async (payment) => {
      if (!checkoutPage) return { ok: false };
      const res = await finalizeSlipCheckout({
        tableId: checkoutPage.tableId,
        tableLabel: checkoutPage.tableLabel,
        payment,
      });
      if (!res?.ok) {
        window.alert('伝票が空のため会計できません。提供済みの明細・飲み放題プランを確認してください。');
      }
      return res;
    },
    [checkoutPage, finalizeSlipCheckout]
  );

  const completeCheckoutFlow = useCallback(() => {
    setCheckoutPage(null);
    setStaffTab(STAFF_TABS.checkoutDone);
  }, []);

  const hasQueue = pendingOrders.length > 0;
  const activeTabLabel =
    staffTab === STAFF_TABS.orders
      ? '未提供の注文'
      : staffTab === STAFF_TABS.tableStatus
        ? '各卓・伝票'
        : staffTab === STAFF_TABS.checkoutDone
          ? 'お会計済み'
          : staffTab === STAFF_TABS.sweetsStock
            ? 'スイーツ在庫'
            : staffTab === STAFF_TABS.drinkSpot
              ? 'スポット品'
              : 'カフェ・テイクアウト';

  const todayDateKey = getLocalDateKey(now);
  const todayCheckoutEntries = useMemo(() => {
    const { entries } = loadDailyLedger();
    return entries
      .filter((e) => e && e.dateKey === todayDateKey)
      .sort((a, b) => (Number(b.recordedAt) || 0) - (Number(a.recordedAt) || 0));
  }, [todayDateKey, ledgerRevision]);

  const [liveFlash, setLiveFlash] = useState({ situation: false, drink: false, food: false });
  const liveSnapRef = useRef(null);

  useEffect(() => {
    const snap = {
      situation: pendingOrders.length,
      drink: pendingDrinkCount,
      food: pendingFoodCount,
    };
    if (liveSnapRef.current === null) {
      liveSnapRef.current = snap;
      return;
    }
    const prev = liveSnapRef.current;
    const next = {
      situation: prev.situation !== snap.situation,
      drink: prev.drink !== snap.drink,
      food: prev.food !== snap.food,
    };
    if (next.situation || next.drink || next.food) {
      setLiveFlash(next);
      liveSnapRef.current = snap;
      const t = setTimeout(() => setLiveFlash({ situation: false, drink: false, food: false }), 900);
      return () => clearTimeout(t);
    }
    liveSnapRef.current = snap;
  }, [pendingOrders.length, pendingDrinkCount, pendingFoodCount]);

  /** 未提供に「新しい行」が増えたときだけアラート（初回ロードでは鳴らさない） */
  useEffect(() => {
    const next = new Set(pendingOrders.map((o) => o.id));
    if (pendingIdsForSoundRef.current === null) {
      pendingIdsForSoundRef.current = next;
      return;
    }
    let hasNew = false;
    for (const id of next) {
      if (!pendingIdsForSoundRef.current.has(id)) {
        hasNew = true;
        break;
      }
    }
    pendingIdsForSoundRef.current = next;
    if (hasNew) playKitchenNewOrderAlert();
  }, [pendingOrders]);

  useEffect(() => {
    const next = new Set(guestNomihodaiIntentLabels.map(String));
    if (nhIntentLabelsForSoundRef.current === null) {
      nhIntentLabelsForSoundRef.current = next;
      return;
    }
    let hasNewIntent = false;
    for (const lbl of next) {
      if (!nhIntentLabelsForSoundRef.current.has(lbl)) {
        hasNewIntent = true;
        break;
      }
    }
    nhIntentLabelsForSoundRef.current = next;
    if (hasNewIntent) playKitchenNomihodaiIntentAlert();
  }, [guestNomihodaiIntentLabels]);

  useEffect(() => {
    const onLedger = () => setLedgerRevision((n) => n + 1);
    window.addEventListener('beifutei-daily-ledger-updated', onLedger);
    return () => window.removeEventListener('beifutei-daily-ledger-updated', onLedger);
  }, []);

  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissingScreen />;
  }

  return (
    <div
      className={[
        'kitchen-v2',
        staffTab === STAFF_TABS.retailTakeout ? 'kitchen-v2--retail-takeout' : '',
        staffTab !== STAFF_TABS.orders ? 'kitchen-v2--work-tab' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <SupabaseConnectionBanner variant="kitchen" />
      <PwaTableRibbon tableLabel={staffFocusTableLabel} role="kitchen" />
      <header className="kitchen-v2-topbar">
        <div className="kitchen-v2-brand">
          <strong>YUM</strong>
          <span>KITCHEN DISPLAY SYSTEM</span>
        </div>
        <nav className="kitchen-v2-tabs" aria-label="スタッフ機能タブ">
          <button
            type="button"
            className={`kitchen-v2-tab${staffTab === STAFF_TABS.orders ? ' is-active' : ''}`}
            onClick={() => setStaffTab(STAFF_TABS.orders)}
          >
            注文一覧
            {pendingOrders.length > 0 ? (
              <span className="kitchen-v2-tab__badge kitchen-v2-tab__badge--pending" aria-hidden>
                {pendingOrders.length > 99 ? '99+' : pendingOrders.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`kitchen-v2-tab${staffTab === STAFF_TABS.tableStatus ? ' is-active' : ''}`}
            onClick={() => setStaffTab(STAFF_TABS.tableStatus)}
          >
            各卓・伝票
            {guestNomihodaiIntentLabels.length > 0 ? (
              <span className="kitchen-v2-tab__badge kitchen-v2-tab__badge--nh-intent" aria-hidden>
                NH{guestNomihodaiIntentLabels.length}
              </span>
            ) : null}
            {hasCheckoutRequests ? (
              <span className="kitchen-v2-tab__badge kitchen-v2-tab__badge--checkout" aria-hidden>
                会計{checkoutRequestLabels.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`kitchen-v2-tab${staffTab === STAFF_TABS.checkoutDone ? ' is-active' : ''}`}
            onClick={() => setStaffTab(STAFF_TABS.checkoutDone)}
          >
            お会計済み
          </button>
          <button
            type="button"
            className={`kitchen-v2-tab kitchen-v2-tab--retail-takeout${staffTab === STAFF_TABS.retailTakeout ? ' is-active' : ''}`}
            onClick={() => setStaffTab(STAFF_TABS.retailTakeout)}
          >
            カフェ・テイクアウト
          </button>
          <button
            type="button"
            className={`kitchen-v2-tab kitchen-v2-tab--sweets-stock${staffTab === STAFF_TABS.sweetsStock ? ' is-active' : ''}`}
            onClick={() => setStaffTab(STAFF_TABS.sweetsStock)}
          >
            スイーツ在庫
          </button>
          <button
            type="button"
            className={`kitchen-v2-tab kitchen-v2-tab--drink-spot${staffTab === STAFF_TABS.drinkSpot ? ' is-active' : ''}`}
            onClick={() => setStaffTab(STAFF_TABS.drinkSpot)}
          >
            スポット品
          </button>
        </nav>
        <KitchenReceiptPreviewButton payload={buildSampleReceiptPayload()} compact label="レシート見本" />
        <KitchenRealtimeBadge />
      </header>

      <StoreEntryUrlsPanel variant="kitchen" />
      <div className="kitchen-focus-bar" role="region" aria-label="操作中の卓">
        <span className="kitchen-focus-bar__label">操作中の卓</span>
        <select
          className="kitchen-focus-bar__select"
          value={staffFocusTableLabel || ''}
          onChange={(e) => {
            const v = normalizeTableLabelKey(e.target.value);
            if (v) setSessionTableLabel(v);
          }}
        >
          <option value="">（未選択・伝票の卓をタップ）</option>
          {slipBoardTableLabels.map((lbl) => (
            <option key={lbl} value={lbl}>
              卓{lbl}
            </option>
          ))}
        </select>
        {!staffFocusTableLabel ? (
          <span className="kitchen-focus-bar__hint kitchen-focus-bar__hint--warn">
            卓を選ぶか、各卓・伝票で操作
          </span>
        ) : null}
      </div>

      {guestNomihodaiIntentLabels.length > 0 ? (
        <div className="kitchen-nh-intent-sticky" role="alert" aria-live="assertive">
          <span className="kitchen-nh-intent-sticky__icon" aria-hidden>
            🍻
          </span>
          <div className="kitchen-nh-intent-sticky__body">
            <strong className="kitchen-nh-intent-sticky__title">飲み放題のご希望</strong>
            <span className="kitchen-nh-intent-sticky__tables">
              卓{guestNomihodaiIntentLabels.join('・')}
            </span>
            <span className="kitchen-nh-intent-sticky__hint">
              人数を確認して「飲み放題開始」。未提供がある卓は注文一覧からも開始できます。
            </span>
          </div>
          <button
            type="button"
            className="kitchen-nh-intent-sticky__cta"
            onClick={() => openSlipTabWithNhOps(guestNomihodaiIntentLabels[0])}
          >
            各卓・伝票へ
          </button>
        </div>
      ) : null}

      <div className="kitchen-live-strip" role="region" aria-label="未提供サマリー">
        <button
          type="button"
          className={[
            'kitchen-live-cell kitchen-live-cell--situation kitchen-live-cell--tappable',
            liveFlash.situation ? 'kitchen-live-cell--flash' : '',
            pendingOrders.length > 0 ? 'kitchen-live-cell--has-queue' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={goToOrdersTab}
          aria-label={`未提供${pendingOrders.length}件。注文一覧タブへ移動`}
        >
          <span className="kitchen-live-cell__label">状況件数</span>
          <span className="kitchen-live-cell__value-wrap">
            {pendingOrders.length > 0 ? (
              <span
                className={`kitchen-live-cell__signal${liveFlash.situation ? ' kitchen-live-cell__signal--pop' : ''}`}
                aria-hidden
              >
                {pendingOrders.length > 99 ? '99+' : pendingOrders.length}
              </span>
            ) : null}
            <strong className="kitchen-live-cell__value">{pendingOrders.length}件</strong>
          </span>
          <span className="kitchen-live-cell__sub">未提供の合計・タップで注文一覧へ</span>
        </button>
        <div
          className={`kitchen-live-cell kitchen-live-cell--drink${liveFlash.drink ? ' kitchen-live-cell--flash' : ''}`}
          role="status"
        >
          <span className="kitchen-live-cell__label">飲み物オーダー数</span>
          <strong className="kitchen-live-cell__value">{pendingDrinkCount}件</strong>
          <span className="kitchen-live-cell__sub">飲み放題・ドリンク等</span>
        </div>
        <div
          className={`kitchen-live-cell kitchen-live-cell--food${liveFlash.food ? ' kitchen-live-cell--flash' : ''}`}
          role="status"
        >
          <span className="kitchen-live-cell__label">フードオーダー数</span>
          <strong className="kitchen-live-cell__value">{pendingFoodCount}件</strong>
          <span className="kitchen-live-cell__sub">麺・ピザ・サイド等</span>
        </div>
        <button
          type="button"
          className={[
            'kitchen-live-cell kitchen-live-cell--checkout kitchen-live-cell--tappable',
            hasCheckoutRequests ? 'kitchen-live-cell--has-checkout' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={openCheckoutRequestFlow}
          aria-label={
            hasCheckoutRequests
              ? `お会計依頼${checkoutRequestLabels.length}卓。会計ページを開く`
              : 'お会計依頼はありません。各卓・伝票タブへ'
          }
        >
          <span className="kitchen-live-cell__label">お会計依頼</span>
          <strong className="kitchen-live-cell__value">
            {hasCheckoutRequests ? `${checkoutRequestLabels.length}卓` : '—'}
          </strong>
          <span className="kitchen-live-cell__sub">
            {hasCheckoutRequests ? `卓${checkoutRequestLabels.join('・')}・タップで会計` : 'タップで伝票タブ'}
          </span>
        </button>
        <button
          type="button"
          className="kitchen-live-cell kitchen-live-cell--verbal kitchen-live-cell--tappable"
          onClick={() => {
            if (staffFocusTableLabel) {
              setVerbalOrderTable(staffFocusTableLabel);
              return;
            }
            setStaffTab(STAFF_TABS.tableStatus);
          }}
          aria-label="口頭で受けた注文を伝票に追加"
        >
          <span className="kitchen-live-cell__label">口頭注文</span>
          <strong className="kitchen-live-cell__value">＋追加</strong>
          <span className="kitchen-live-cell__sub">卓を選んで品目を登録</span>
        </button>
      </div>

      <div
        className={[
          'kitchen-v2-layout',
          'kitchen-v2-layout--no-side',
          staffTab === STAFF_TABS.retailTakeout ? 'kitchen-v2-layout--retail-takeout' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <section className="kitchen-v2-main">
          <header className="kitchen-v2-headline">
            <h1 id={staffTab === STAFF_TABS.orders ? 'kitchen-pending-heading' : undefined}>{activeTabLabel}</h1>
            {staffTab === STAFF_TABS.orders ? (
              <p className="kitchen-v2-headline__lead">
                古い注文が上。客が<strong>1回送信した分</strong>が1枚のカードです。次の送信から新しいカードが並びます。
              </p>
            ) : null}
          </header>
          <TableMemoRibbon tableMemoByLabel={session.tableMemoByLabel} hotTableLabels={pendingTableLabelsSet} />
          {staffTab === STAFF_TABS.orders ? (
            <>
              {nhIntentOutsideQueueLabels.length > 0 ? (
                <button
                  type="button"
                  className="kitchen-guest-intent kitchen-guest-intent--muted kitchen-guest-intent--nav"
                  aria-label="各卓・伝票タブへ移動し、飲み放題の詳細操作を開く"
                  onClick={() => openSlipTabWithNhOps(nhIntentOutsideQueueLabels[0])}
                >
                  <strong>卓{nhIntentOutsideQueueLabels.join('・')}</strong>
                  から飲み放題の希望がありますが、<strong>未提供キューに並んでいない卓</strong>
                  のため、人数確認・開始・停止・希望の閉じるは
                  <strong>「各卓・伝票」</strong>タブで行ってください。
                  <span className="kitchen-guest-intent__tap-hint">タップで各卓・伝票へ</span>
                </button>
              ) : null}
            </>
          ) : (
            guestNomihodaiIntentLabels.length > 0 && (
              <button
                type="button"
                className="kitchen-guest-intent kitchen-guest-intent--nav"
                aria-label="各卓・伝票タブへ移動し、飲み放題の詳細操作を開く"
                onClick={() => openSlipTabWithNhOps(guestNomihodaiIntentLabels[0])}
              >
                <strong>
                  卓{guestNomihodaiIntentLabels.join('・')}：客席から飲み放題の希望があります。
                </strong>
                「各卓・伝票」タブで該当卓が強調表示されます。人数を確認して「飲み放題開始」を押してください。
                <span className="kitchen-guest-intent__tap-hint">タップで各卓・伝票へ</span>
              </button>
            )
          )}
          {hasCheckoutRequests ? (
            <div className="kitchen-guest-intent kitchen-guest-intent--checkout kitchen-guest-intent--checkout-wide" role="alert">
              <div className="kitchen-checkout-alert__main">
                <strong className="kitchen-checkout-alert__title">お会計のご依頼</strong>
                <span className="kitchen-checkout-alert__tables">
                  卓{checkoutRequestLabels.join('・')}（{checkoutRequestLabels.length}卓）
                </span>
                <span className="kitchen-checkout-alert__hint">
                  「会計ページへ」で依頼卓の伝票を確認し、支払い方法を選んで確定すると日計（お会計済みタブ）へ記録されます。依頼だけ消す場合は卓ごとに「依頼を消す」を押します。
                </span>
              </div>
              <div className="kitchen-checkout-alert__actions">
                <button type="button" className="kitchen-btn kitchen-btn--serve" onClick={openCheckoutRequestFlow}>
                  会計ページへ
                </button>
                <button type="button" className="kitchen-btn kitchen-btn--checkout-dismiss" onClick={goToTableStatusTab}>
                  伝票タブのみ
                </button>
                {checkoutRequestLabels.map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    className="kitchen-btn kitchen-btn--checkout-dismiss"
                    onClick={() => clearCheckoutRequestForTable(lbl)}
                  >
                    卓{lbl} 依頼を消す
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="kitchen-v2-content">
            {staffTab === STAFF_TABS.orders && (
              <>
                  <section
                    ref={ordersHubRef}
                    id="kitchen-orders-hub"
                    className={`kitchen-orders kitchen-orders--in-hub${
                      hasQueue ? ' kitchen-orders--pending' : ''
                    }`}
                    aria-labelledby="kitchen-pending-heading"
                  >
                    <div className="kitchen-orders__toolbar" aria-label="未提供件数">
                      <span className={`kitchen-orders__badge${hasQueue ? ' kitchen-orders__badge--live' : ''}`}>
                        未提供 {pendingOrders.length} 点
                      </span>
                    </div>

                    {nhIntentQuickFromQueueLabels.length > 0 ? (
                      <div className="kitchen-nh-intent-queue" role="region" aria-label="未提供から飲み放題希望を開始">
                        <p className="kitchen-nh-intent-queue__title">
                          飲み放題の希望（未提供キューに並んでいる卓のみ）
                        </p>
                        <div className="kitchen-nh-intent-queue__cards">
                          {nhIntentQuickFromQueueLabels.map((label) => {
                            const row = nhForm[label] || { men: 1, women: 1 };
                            return (
                              <article key={label} className="kitchen-nh-intent-queue__card">
                                <div className="kitchen-nh-intent-queue__card-head">
                                  <strong>卓{label}</strong>
                                  <span className="kitchen-nh-intent-queue__hint">客席から希望あり</span>
                                </div>
                                <div className="kitchen-table-status__nh-row kitchen-nh-intent-queue__nh-row">
                                  <label className="kitchen-table-status__nh-field">
                                    <span>男性（￥{prices.men.toLocaleString()}）</span>
                                    <input
                                      type="number"
                                      min={0}
                                      className="kitchen-table-status__nh-input"
                                      value={row.men}
                                      onChange={(e) =>
                                        setNhForm((prev) => ({
                                          ...prev,
                                          [label]: {
                                            ...(prev[label] || { men: 1, women: 1 }),
                                            men: Math.max(0, Number(e.target.value) || 0),
                                          },
                                        }))
                                      }
                                    />
                                  </label>
                                  <label className="kitchen-table-status__nh-field">
                                    <span>女性（￥{prices.women.toLocaleString()}）</span>
                                    <input
                                      type="number"
                                      min={0}
                                      className="kitchen-table-status__nh-input"
                                      value={row.women}
                                      onChange={(e) =>
                                        setNhForm((prev) => ({
                                          ...prev,
                                          [label]: {
                                            ...(prev[label] || { men: 1, women: 1 }),
                                            women: Math.max(0, Number(e.target.value) || 0),
                                          },
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                                <div className="kitchen-nh-intent-queue__actions">
                                  <button
                                    type="button"
                                    className="kitchen-table-status__nh-start kitchen-table-status__nh-start--pulse"
                                    disabled={!!getNomihodaiForTable(session, label)?.active}
                                    onClick={() => void handleConfirmStartNomihodai(label)}
                                  >
                                    飲み放題開始（90分）
                                  </button>
                                  <button
                                    type="button"
                                    className="kitchen-nh-intent-queue__dismiss"
                                    onClick={() => clearNomihodaiGuestIntent(label)}
                                  >
                                    希望を閉じる
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="kitchen-pending-scroll">
                      {pendingOrders.length === 0 ? (
                        <p className="kitchen-pending-fifo-empty">未提供の注文はありません</p>
                      ) : (
                        <ul className="kitchen-pending-batch-list" aria-label="未提供キュー（古い順・1送信1カード）">
                          {pendingOrderBatches.map((batch) => {
                            const nhT = getNomihodaiForTable(session, batch.tableLabel);
                            const nhHere = !!nhT?.active;
                            const autoExtendMin =
                              nhHere && nhT
                                ? Math.max(0, Math.ceil((Number(nhT.nextAutoExtendMs || nhT.endMs) - now) / 60000))
                                : null;
                            const extCnt = nhHere && nhT ? Math.max(0, Number(nhT.extensionCount) || 0) : 0;
                            const heroEmoji = batchHeroEmoji(batch.orders);
                            const batchMemoRaw = session.tableMemoByLabel?.[batch.tableLabel];
                            const batchMemo =
                              typeof batchMemoRaw === 'string' ? batchMemoRaw.replace(/\s+/g, ' ').trim() : '';
                            return (
                              <li
                                key={batch.key}
                                className={[
                                  'kitchen-pending-batch',
                                  batch.continuesPrevBatch ? 'kitchen-pending-batch--continue' : '',
                                  batch.afterOtherTables ? 'kitchen-pending-batch--repeek' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                              >
                                <div className="kitchen-pending-batch__hero">
                                  <div className="kitchen-pending-batch__queue" title="提供順（小さいほど先）">
                                    {batch.queuePos}
                                  </div>
                                  <div className="kitchen-pending-batch__hero-main">
                                    <div className="kitchen-pending-batch__meta">
                                      <span className="kitchen-pending-fifo-table">卓{batch.tableLabel}</span>
                                      <span className="kitchen-pending-batch__count">{batch.orders.length}品</span>
                                      {batch.continuesPrevBatch ? (
                                        <span className="kitchen-pending-fifo-tag kitchen-pending-fifo-tag--continue">
                                          同卓・続き
                                        </span>
                                      ) : null}
                                      {batch.afterOtherTables ? (
                                        <span className="kitchen-pending-fifo-tag kitchen-pending-fifo-tag--repeek">
                                          同卓・追加
                                        </span>
                                      ) : null}
                                      {nhHere ? (
                                        <span className="kitchen-pending-fifo-nh" title="飲み放題プラン">
                                          NH 約{autoExtendMin ?? '—'}分
                                          {extCnt > 0 ? ` ・延${extCnt}` : ''} ・￥{nhT.billTotal.toLocaleString()}
                                        </span>
                                      ) : null}
                                      <span className="kitchen-pending-fifo-time">{fmtTime(batch.anchorT)}</span>
                                    </div>
                                    {batchMemo ? <p className="kitchen-pending-batch__memo">卓メモ：{batchMemo}</p> : null}
                                    <div className="kitchen-pending-batch__hero-body">
                                      <span className="kitchen-pending-batch__hero-emoji" aria-hidden>
                                        {heroEmoji}
                                      </span>
                                      <div className="kitchen-pending-batch__hero-actions">
                                        <button
                                          type="button"
                                          className="kitchen-pending-batch__serve-all"
                                          onClick={() => void serveOrderBatch(batch.orders)}
                                        >
                                          この注文をまとめて提供済
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <ul className="kitchen-pending-batch__lines" aria-label="品目">
                                  {batch.orders.map((o) => (
                                    <li key={o.id} className="kitchen-pending-batch__line">
                                      <span className="kitchen-pending-batch__line-emoji" aria-hidden>
                                        {orderKitchenEmoji(o)}
                                      </span>
                                      <span className="kitchen-pending-batch__line-name">
                                        {o.itemName}
                                        {(Number(o.itemPrice) || 0) > 0 ? (
                                          <span className="kitchen-pending-batch__line-extra-yen">
                                            {' '}
                                            ￥{(Number(o.itemPrice) || 0).toLocaleString()}
                                          </span>
                                        ) : null}
                                      </span>
                                      <button
                                        type="button"
                                        className="kitchen-pending-batch__line-serve"
                                        onClick={() => void handleMarkServed(o.id)}
                                      >
                                        提供済
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {pendingBulkTables.length > 0 ? (
                      <div className="kitchen-pending-fifo-bulk" aria-label="卓ごと一括提供済">
                        <span className="kitchen-pending-fifo-bulk__label">
                          卓ごと一括（キュー順とは別にまとめて済ませる）
                        </span>
                        <div className="kitchen-pending-fifo-bulk__btns">
                          {pendingBulkTables.map((t) => (
                            <button
                              key={t.tableLabel}
                              type="button"
                              className="kitchen-pending-fifo-bulk__btn"
                              onClick={() => void handleMarkTableServed(t.tableId, t.tableLabel)}
                            >
                              卓{t.tableLabel} 全{t.count}件
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                <p className="kitchen-tab-crosslink">
                  卓メモ・飲み放題・卓番の同期は<strong>「各卓・伝票」</strong>タブで操作できます。
                </p>
              </>
            )}

            {staffTab === STAFF_TABS.tableStatus && (
              <>
                <section
                  className="kitchen-orders kitchen-orders--in-hub kitchen-table-hub kitchen-table-hub--slip-board"
                  aria-labelledby="kitchen-tables-heading"
                >
                    <div className="kitchen-orders__head">
                      <h2 id="kitchen-tables-heading" className="kitchen-orders__title">
                        各卓・伝票
                      </h2>
                      <span className="kitchen-orders__badge">{servedOrders.length}件 提供済</span>
                    </div>
                    <details className="kitchen-orders__help">
                      <summary>使い方</summary>
                      <p className="kitchen-orders__lead">
                        左の<strong>卓一覧</strong>で選び、右で伝票を操作します。未提供は「提供済」、提供済行の切替で
                        <strong>飲み放題／通常</strong>を訂正。会計は上部の<strong>会計</strong>ボタンから。飲み放題の延長は時間到達で自動（
                        {NOMIHODAI_EXTENSION_PRICE_YEN.toLocaleString()}
                        円／回・税込）。
                      </p>
                    </details>
                    <KitchenSlipBoard
                      labels={slipBoardTableLabels}
                      selectedLabel={slipBoardSelectedLabel}
                      onSelectLabel={handleSelectSlipTable}
                      pickerMeta={slipBoardPickerMeta}
                      ordersByTableLabel={ordersByTableLabel}
                      servedByTable={servedByTable}
                      session={session}
                      now={now}
                      prices={prices}
                      nhForm={nhForm}
                      setNhForm={setNhForm}
                      tableNhOpsOpen={tableNhOpsOpen}
                      setTableNhOpsOpen={setTableNhOpsOpen}
                      staffFocusTableLabel={staffFocusTableLabel}
                      guestNomihodaiIntentLabels={guestNomihodaiIntentLabels}
                      setTableMemo={setTableMemo}
                      setTableAlcoholCharge={setTableAlcoholCharge}
                      setSessionTableLabel={setSessionTableLabel}
                      clearNomihodaiGuestIntent={clearNomihodaiGuestIntent}
                      clearCheckoutRequestForTable={clearCheckoutRequestForTable}
                      clearGuestFarewellForReuse={clearGuestFarewellForReuse}
                      endNomihodai={endNomihodai}
                      handleConfirmStartNomihodai={handleConfirmStartNomihodai}
                      handleMarkServed={handleMarkServed}
                      servePendingForTable={serveOrderBatch}
                      handleRemoveOrder={handleRemoveOrder}
                      setOrderIsNomihodai={setOrderIsNomihodai}
                      setCheckoutPage={setCheckoutPage}
                      setVerbalOrderTable={setVerbalOrderTable}
                      openSlipTabWithNhOps={openSlipTabWithNhOps}
                    />
                  </section>

                <section className="kitchen-panel kitchen-panel--muted kitchen-flow-note">
                    <h2 className="kitchen-h2">会計フロー（飲み放題）</h2>
                    <ol className="kitchen-flow-note__list">
                      <li>客が「お会計」→ このタブ・上部バナーに通知</li>
                      <li>
                        各卓カードの<strong>会計</strong>または上部の<strong>会計ページへ</strong>で明細確認のうえ、現金／カード／カード＋5%を選ぶと飲み放題停止・日計記録・<strong>お会計済み</strong>タブへ移動します
                      </li>
                      <li>
                        客席は THANK YOU → 退席案内のあと、厨房の<strong>バッシング完了</strong>または客席の<strong>バッシングOK</strong>で飲み放題タブを再利用可能にする
                      </li>
                    </ol>
                    <p className="kitchen-note kitchen-note--compact">
                      時間到達で自動延長 → 延長単価をプランに加算 → 客UIの残り時間も更新されます。
                    </p>
                </section>
              </>
            )}

            {staffTab === STAFF_TABS.checkoutDone && (
              <section
                className="kitchen-orders kitchen-orders--in-hub kitchen-checkout-log"
                aria-labelledby="kitchen-checkout-log-heading"
              >
                <div className="kitchen-orders__head">
                  <h2 id="kitchen-checkout-log-heading" className="kitchen-orders__title">
                    お会計済み（本日）
                  </h2>
                  <span className="kitchen-orders__badge">{todayCheckoutEntries.length}件</span>
                </div>
                <p className="kitchen-orders__lead">
                  「各卓・伝票」で各卓の<strong>会計</strong>を確定するたびに、ここへ新しい行が積み上がります。iPad＋PassPRNT＋mPOP では会計画面や各行から<strong>必要なときだけレシート印刷</strong>できます。客席の飲み放題タブが退席案内のままのときは、各卓カードの<strong>バッシング完了・卓タブレット再利用</strong>（または客席のバッシングOK）でリセットしてください。日計データはこの端末の localStorage と共通です。オーナー向けは{' '}
                  <code className="kitchen-code">master.html</code> から行ってください。
                </p>
                {todayCheckoutEntries.length === 0 ? (
                  <div className="kitchen-orders__empty">
                    <span className="kitchen-orders__empty-icon" aria-hidden>
                      📋
                    </span>
                    <p>本日、まだ会計確定の記録がありません。</p>
                  </div>
                ) : (
                  <div className="kitchen-checkout-log__list">
                    {todayCheckoutEntries.map((e) => (
                      <article key={e.id} className="kitchen-checkout-log__card">
                        <header className="kitchen-checkout-log__card-head">
                          <span className="kitchen-checkout-log__table">卓{e.tableLabel}</span>
                          <time className="kitchen-checkout-log__time" dateTime={new Date(e.recordedAt).toISOString()}>
                            {fmtTime(e.recordedAt)}
                          </time>
                          <span
                            className={`kitchen-checkout-log__pay kitchen-checkout-log__pay--${
                              e.payment === 'cash' ? 'cash' : e.payment === 'card_5pct' ? 'card5' : 'card'
                            }`}
                          >
                            {formatLedgerPaymentJa(e.payment)}
                          </span>
                          <span className="kitchen-checkout-log__total">￥{Number(e.total || 0).toLocaleString()}</span>
                          <div className="kitchen-checkout-log__card-actions">
                            <KitchenReceiptPreviewButton
                              compact
                              label="プレビュー"
                              payload={buildLedgerReceiptPayload(e)}
                            />
                            {canUsePassPrnt() ? (
                              <button
                                type="button"
                                className="kitchen-checkout-log__reprint"
                                onClick={() =>
                                  printReceiptWithFeedback(buildLedgerReceiptPayload(e), {
                                    openDrawer: false,
                                  })
                                }
                              >
                                再印刷
                              </button>
                            ) : null}
                            <LedgerEntryEditDateButton
                              entry={e}
                              variant="kitchen"
                              onUpdated={() => setLedgerRevision((r) => r + 1)}
                            />
                            <LedgerEntryDeleteButton
                              entry={e}
                              variant="kitchen"
                              onDeleted={() => setLedgerRevision((r) => r + 1)}
                            />
                          </div>
                        </header>
                        {e.checkoutMemo ? (
                          <p className="kitchen-checkout-log__memo">メモ：{e.checkoutMemo}</p>
                        ) : null}
                        {e.nomihodaiPlanYen > 0 ? (
                          <p className="kitchen-checkout-log__nh-plan">
                            飲み放題プラン ￥{Number(e.nomihodaiPlanYen).toLocaleString()}（税込）
                          </p>
                        ) : null}
                        <ul className="kitchen-checkout-log__lines" aria-label="会計時点の伝票行">
                          {(Array.isArray(e.lines) ? e.lines : []).map((line, li) => {
                            const kind = line?.kind;
                            const isPlanNh = kind === 'nh';
                            const isNhExtra = kind === 'nh_extra';
                            const isAlcoholCharge = kind === 'alcohol_charge';
                            const name = String(line?.name || '').trim() || '（品目）';
                            const price =
                              line && Number.isFinite(Number(line.price)) ? Math.max(0, Number(line.price)) : null;
                            return (
                              <li key={`${e.id}-L${li}`} className="kitchen-checkout-log__line">
                                <span className="kitchen-checkout-log__line-ico" aria-hidden>
                                  {isAlcoholCharge ? '🍷' : isPlanNh || isNhExtra ? '🍺' : '🍽️'}
                                </span>
                                <span className="kitchen-checkout-log__line-name">{name}</span>
                                {price != null && price > 0 ? (
                                  <span className="kitchen-checkout-log__line-price">￥{price.toLocaleString()}</span>
                                ) : isPlanNh ? (
                                  <span className="kitchen-checkout-log__line-price kitchen-checkout-log__line-price--nh">
                                    プラン内
                                  </span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {staffTab === STAFF_TABS.sweetsStock && <TakeoutSweetsStockPanel />}

            {staffTab === STAFF_TABS.drinkSpot && <DrinkSpotPanel />}

            {staffTab === STAFF_TABS.retailTakeout && (
              <KitchenStaffRetailHub onRetailCheckoutComplete={() => setStaffTab(STAFF_TABS.checkoutDone)} />
            )}
          </div>
        </section>
      </div>

      {checkoutPickerOpen ? (
        <div
          className="kitchen-checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kitchen-checkout-pick-title"
          onClick={() => setCheckoutPickerOpen(false)}
        >
          <div className="kitchen-checkout-modal kitchen-checkout-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 id="kitchen-checkout-pick-title" className="kitchen-checkout-title">
              会計する卓を選択
            </h2>
            <p className="kitchen-checkout-hint">
              お会計依頼が複数卓あります。伝票を確認してから、支払い方法まで進んでください。
            </p>
            <div className="kitchen-checkout-pick-grid">
              {checkoutRequestLabels.map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  className="kitchen-checkout-pick-btn"
                  onClick={() => {
                    const slip = resolveSlipBundleForTableLabel(servedByTable, session, lbl);
                    setCheckoutPage({ tableLabel: slip.tableLabel, tableId: slip.tableId });
                    setCheckoutPickerOpen(false);
                    setStaffTab(STAFF_TABS.tableStatus);
                  }}
                >
                  卓{lbl}
                </button>
              ))}
            </div>
            <button type="button" className="kitchen-checkout-cancel" onClick={() => setCheckoutPickerOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      ) : null}

      {checkoutPage ? (
        <KitchenCheckoutModal
          tableLabel={checkoutPage.tableLabel}
          tableId={checkoutPage.tableId}
          checkoutSlip={checkoutSlip}
          session={session}
          memo={checkoutPageMemo}
          pendingCount={checkoutPendingCount}
          hasCheckoutRequest={!!session.checkoutRequestByLabel?.[checkoutPage.tableLabel]}
          onClose={() => setCheckoutPage(null)}
          onEditSlip={() => {
            setCheckoutPage(null);
            setStaffTab(STAFF_TABS.tableStatus);
          }}
          onFinalize={finalizeCheckoutPayment}
          onComplete={completeCheckoutFlow}
        />
      ) : null}

      {tableDetailLabel ? (
        <div
          className="kitchen-checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kitchen-table-detail-title"
          onClick={() => setTableDetailLabel(null)}
        >
          <div className="kitchen-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="kitchen-table-detail-title" className="kitchen-detail-modal__title">
              TABLE {tableDetailLabel}・注文履歴
            </h2>
            <ul className="kitchen-detail-modal__list">
              {(ordersByTableLabel.get(tableDetailLabel) || []).map((o) => {
                const meta = orderKindMeta(o);
                return (
                  <li
                    key={o.id}
                    className={`kitchen-detail-modal__row${
                      isNomihodaiChargedExtra(o) ? ' kitchen-detail-modal__row--nh-extra' : ''
                    }`}
                  >
                    <div className="kitchen-detail-modal__main">
                      <span className="kitchen-detail-modal__emoji" aria-hidden>
                        {meta.emoji}
                      </span>
                      <div className="kitchen-detail-modal__text">
                        <span className="kitchen-detail-modal__name">{o.itemName}</span>
                        <span className="kitchen-detail-modal__meta">
                          {fmtTime(o.createdAt)} ・{' '}
                          {orderLineTaxInLabel(o)}
                        </span>
                      </div>
                    </div>
                    <div className="kitchen-detail-modal__actions">
                      <OrderBillingToggle
                        orderId={o.id}
                        isNomihodai={nhToggleShowsNomihodaiActive(o)}
                        onSetNomihodai={setOrderIsNomihodai}
                        compact
                      />
                      {o.status === 'pending' ? (
                        <>
                          <span className="kitchen-detail-modal__tag kitchen-detail-modal__tag--wait">未提供</span>
                          <button
                            type="button"
                            className="kitchen-detail-modal__serve"
                            onClick={() => void handleMarkServed(o.id)}
                          >
                            提供済み
                          </button>
                        </>
                      ) : (
                        <span className="kitchen-detail-modal__tag kitchen-detail-modal__tag--ok">提供済</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {tableDetailTotals ? (
              <div className="kitchen-detail-modal__totals" aria-label="税込の目安合計">
                <p className="kitchen-detail-modal__totals-caption">税込の目安</p>
                <div className="kitchen-detail-modal__totals-row">
                  通常小計（税込）{' '}
                  <span>￥{tableDetailTotals.normalSubtotal.toLocaleString()}</span>
                </div>
                {tableDetailTotals.nomihodaiPlanYen > 0 ? (
                  <div className="kitchen-detail-modal__totals-row">
                    飲み放題プラン（税込）{' '}
                    <span>￥{tableDetailTotals.nomihodaiPlanYen.toLocaleString()}</span>
                  </div>
                ) : null}
                {(tableDetailTotals.alcoholChargeYen ?? 0) > 0 ? (
                  <div className="kitchen-detail-modal__totals-row kitchen-detail-modal__totals-row--alcohol">
                    {getAlcoholTableCharge(session, tableDetailLabel).lineName}{' '}
                    <span>￥{(tableDetailTotals.alcoholChargeYen ?? 0).toLocaleString()}</span>
                  </div>
                ) : null}
                <strong className="kitchen-detail-modal__totals-grand">
                  合計（税込）￥{tableDetailTotals.grandTaxIn.toLocaleString()}
                </strong>
              </div>
            ) : null}
            <div className="kitchen-detail-modal__foot">
              <button
                type="button"
                className="kitchen-detail-modal__verbal"
                onClick={() => {
                  const lbl = tableDetailLabel;
                  setTableDetailLabel(null);
                  setVerbalOrderTable(lbl);
                }}
              >
                口頭注文
              </button>
              <button
                type="button"
                className="kitchen-detail-modal__checkout"
                onClick={() => {
                  if (!tableDetailLabel) return;
                  const slip = resolveSlipBundleForTableLabel(servedByTable, session, tableDetailLabel);
                  setCheckoutPage({ tableLabel: slip.tableLabel, tableId: slip.tableId });
                  setTableDetailLabel(null);
                  setStaffTab(STAFF_TABS.tableStatus);
                }}
              >
                会計へ進む
              </button>
              <button type="button" className="kitchen-detail-modal__close" onClick={() => setTableDetailLabel(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {verbalOrderTable != null ? (
        <KitchenVerbalOrderSheet
          tableLabel={verbalOrderTable}
          onClose={() => setVerbalOrderTable(null)}
          onSubmitted={handleVerbalOrderSubmitted}
        />
      ) : null}

      <KitchenDiagnosticsFooter />
    </div>
  );
}
