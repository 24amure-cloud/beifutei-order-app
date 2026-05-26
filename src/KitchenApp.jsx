import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALCOHOL_CHARGE_AFTER_21_YEN,
  ALCOHOL_CHARGE_BEFORE_21_YEN,
  alcoholChargeYenPerPersonFromNow,
  getAlcoholTableCharge,
} from './alcoholTableCharge.js';
import { formatLedgerPaymentJa, getLocalDateKey, loadDailyLedger } from './dailyLedger.js';
import { NOMIHODAI_EXTENSION_PRICE_YEN } from './nomihodaiConstants.js';
import { getNomihodaiForTable, TABLE_MEMO_MAX_LEN } from './nomihodaiSession.js';
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
import LedgerEntryDeleteButton from './LedgerEntryDeleteButton.jsx';
import LedgerEntryEditDateButton from './LedgerEntryEditDateButton.jsx';
import {
  buildLedgerReceiptPayload,
  buildSlipReceiptPayload,
  canUsePassPrnt,
  printReceiptWithFeedback,
} from './receiptPrint.js';
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

/** 卓チャージ（人数×単価・税込。500/800 はワンタップ反映） */
function KitchenTableAlcoholChargePanel({ tableLabel, session, setTableAlcoholCharge, now }) {
  const cur = getAlcoholTableCharge(session, tableLabel);
  const [peopleStr, setPeopleStr] = useState('1');
  const [yenStr, setYenStr] = useState(String(ALCOHOL_CHARGE_BEFORE_21_YEN));
  const [applyFlash, setApplyFlash] = useState(false);

  const clockBand = useMemo(() => alcoholChargeYenPerPersonFromNow(now), [now]);

  const bumpPeople = (delta) => {
    setPeopleStr((s) => {
      const n = Math.max(1, Math.min(99, (parseInt(String(s), 10) || 1) + delta));
      return String(n);
    });
  };

  useEffect(() => {
    if (cur.totalYen > 0) {
      setPeopleStr(String(Math.max(1, cur.people)));
      setYenStr(String(Math.max(0, cur.yenPerPerson)));
    } else {
      setPeopleStr('1');
      setYenStr(String(clockBand));
    }
  }, [tableLabel, cur.totalYen, cur.people, cur.yenPerPerson, clockBand]);

  const commitCharge = useCallback(
    (pe, yp) => {
      if (yp <= 0 || pe <= 0) {
        void setTableAlcoholCharge(tableLabel, { people: 0, yenPerPerson: 0 });
        return;
      }
      void setTableAlcoholCharge(tableLabel, { people: pe, yenPerPerson: yp });
      setApplyFlash(true);
      window.setTimeout(() => setApplyFlash(false), 700);
    },
    [setTableAlcoholCharge, tableLabel],
  );

  const onApply = () => {
    const pe = Math.max(1, Math.min(99, Number(peopleStr) || 1));
    const yp = Math.max(0, Math.min(999999, Math.floor(Number(String(yenStr).replace(/[^\d]/g, '')) || 0)));
    commitCharge(pe, yp);
  };

  const onPreset = (yen) => {
    const pe = Math.max(1, Math.min(99, Number(peopleStr) || 1));
    setYenStr(String(yen));
    commitCharge(pe, yen);
  };

  const onClear = () => {
    void setTableAlcoholCharge(tableLabel, { people: 0, yenPerPerson: 0 });
  };

  return (
    <div
      className={`kitchen-table-status__alcohol-block kitchen-table-status__alcohol-block--open${applyFlash ? ' kitchen-table-status__alcohol-block--applied' : ''}`}
    >
      <div className="kitchen-table-status__alcohol-headline">
        <span className="kitchen-table-status__alcohol-headline-title">卓チャージ</span>
        {cur.totalYen > 0 ? (
          <strong className="kitchen-table-status__alcohol-headline-total">￥{cur.totalYen.toLocaleString()}</strong>
        ) : (
          <span className="kitchen-table-status__alcohol-headline-total kitchen-table-status__alcohol-headline-total--muted">
            未設定
          </span>
        )}
      </div>
      <div className="kitchen-table-status__alcohol-compact">
        <div className="kitchen-table-status__alcohol-line">
          <span className="kitchen-table-status__alcohol-line-label">人数</span>
          <span className="kitchen-table-status__alcohol-stepper kitchen-table-status__alcohol-stepper--lg">
            <button
              type="button"
              className="kitchen-table-status__alcohol-stepbtn"
              onClick={() => bumpPeople(-1)}
              aria-label="人数を1減らす"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={99}
              className="kitchen-table-status__alcohol-count-input"
              value={peopleStr}
              onChange={(e) => setPeopleStr(e.target.value)}
              aria-label="チャージ対象人数"
            />
            <button
              type="button"
              className="kitchen-table-status__alcohol-stepbtn"
              onClick={() => bumpPeople(1)}
              aria-label="人数を1増やす"
            >
              ＋
            </button>
          </span>
        </div>
        <div className="kitchen-table-status__alcohol-line">
          <span className="kitchen-table-status__alcohol-line-label">単価</span>
          <div className="kitchen-table-status__alcohol-preset-row">
            <button
              type="button"
              className={`kitchen-table-status__alcohol-preset${clockBand === ALCOHOL_CHARGE_BEFORE_21_YEN ? ' is-suggested' : ''}`}
              onClick={() => onPreset(ALCOHOL_CHARGE_BEFORE_21_YEN)}
            >
              500円
            </button>
            <button
              type="button"
              className={`kitchen-table-status__alcohol-preset${clockBand === ALCOHOL_CHARGE_AFTER_21_YEN ? ' is-suggested' : ''}`}
              onClick={() => onPreset(ALCOHOL_CHARGE_AFTER_21_YEN)}
            >
              800円
            </button>
          </div>
          <input
            type="number"
            min={0}
            max={999999}
            className="kitchen-table-status__alcohol-yen-input"
            value={yenStr}
            onChange={(e) => setYenStr(e.target.value)}
            aria-label="卓チャージ1名あたり金額"
          />
        </div>
        <div className="kitchen-table-status__alcohol-actions">
          <button type="button" className="kitchen-table-status__alcohol-apply" onClick={onApply}>
            反映
          </button>
          <button type="button" className="kitchen-table-status__alcohol-clear" onClick={onClear}>
            クリア
          </button>
        </div>
      </div>
      {cur.totalYen > 0 ? (
        <p className="kitchen-table-status__alcohol-live" role="status">
          伝票・会計に反映済み（{cur.people}名×￥{cur.yenPerPerson.toLocaleString()}）
        </p>
      ) : null}
    </div>
  );
}

/** 飲み放題人数（常時表示・±で変更） */
function KitchenTableNhQuickPanel({
  tableLabel,
  men,
  women,
  prices,
  isNh,
  intentPulse,
  onBumpMen,
  onBumpWomen,
  onStart,
  onStop,
  isSessionTable,
  onSyncTable,
}) {
  const planPreview = Math.max(0, men) * prices.men + Math.max(0, women) * prices.women;
  return (
    <div className="kitchen-table-status__nh-quick">
      <div className="kitchen-table-status__nh-quick-head">
        <span className="kitchen-table-status__nh-quick-title">飲み放題</span>
        {!isNh ? (
          <span className="kitchen-table-status__nh-quick-preview">目安 ￥{planPreview.toLocaleString()}</span>
        ) : (
          <span className="kitchen-table-status__nh-quick-preview kitchen-table-status__nh-quick-preview--on">稼働中</span>
        )}
      </div>
      <div className="kitchen-table-status__nh-quick-grid">
        <div className="kitchen-table-status__nh-quick-cell">
          <span className="kitchen-table-status__nh-quick-label">男 ￥{prices.men.toLocaleString()}</span>
          <span className="kitchen-table-status__nh-stepper">
            <button
              type="button"
              className="kitchen-table-status__nh-stepbtn"
              disabled={isNh}
              onClick={() => onBumpMen(-1)}
              aria-label="男性人数を1減らす"
            >
              −
            </button>
            <span className="kitchen-table-status__nh-count" aria-live="polite">
              {men}
            </span>
            <button
              type="button"
              className="kitchen-table-status__nh-stepbtn"
              disabled={isNh}
              onClick={() => onBumpMen(1)}
              aria-label="男性人数を1増やす"
            >
              ＋
            </button>
          </span>
        </div>
        <div className="kitchen-table-status__nh-quick-cell">
          <span className="kitchen-table-status__nh-quick-label">女 ￥{prices.women.toLocaleString()}</span>
          <span className="kitchen-table-status__nh-stepper">
            <button
              type="button"
              className="kitchen-table-status__nh-stepbtn"
              disabled={isNh}
              onClick={() => onBumpWomen(-1)}
              aria-label="女性人数を1減らす"
            >
              −
            </button>
            <span className="kitchen-table-status__nh-count" aria-live="polite">
              {women}
            </span>
            <button
              type="button"
              className="kitchen-table-status__nh-stepbtn"
              disabled={isNh}
              onClick={() => onBumpWomen(1)}
              aria-label="女性人数を1増やす"
            >
              ＋
            </button>
          </span>
        </div>
      </div>
      <div className="kitchen-table-status__nh-quick-btns">
        <button
          type="button"
          className={`kitchen-table-status__nh-start${intentPulse ? ' kitchen-table-status__nh-start--pulse' : ''}`}
          disabled={isNh}
          onClick={onStart}
        >
          開始
        </button>
        <button type="button" className="kitchen-table-status__nh-stop" disabled={!isNh} onClick={onStop}>
          停止
        </button>
      </div>
      {!isSessionTable ? (
        <button type="button" className="kitchen-table-status__nh-sync-link" onClick={onSyncTable}>
          表示卓を卓{tableLabel}に切替
        </button>
      ) : null}
    </div>
  );
}

const TABLE_HERO_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function buildInitialNhForm() {
  return Object.fromEntries(TABLE_HERO_LABELS.map((l) => [l, { men: 1, women: 1 }]));
}

/** 伝票サマリー（提供済カードに無い卓でも飲み放題プランのみの会計に対応） */
function resolveSlipBundleForTableLabel(servedByTable, session, tableLabel) {
  const tl = String(tableLabel);
  const found = servedByTable.find((t) => String(t.tableLabel) === tl);
  const nh = getNomihodaiForTable(session, tl);
  const nomihodaiPlanYen = nh?.active ? Math.max(0, Number(nh.billTotal) || 0) : 0;
  const alcoholYen = getAlcoholTableCharge(session, tl).totalYen;
  if (found) {
    const plan = nh?.active ? nomihodaiPlanYen : Math.max(0, Number(found.nomihodaiPlanYen) || 0);
    return {
      ...found,
      nomihodaiPlanYen: plan,
      alcoholChargeYen: alcoholYen,
      slipGrandTotal: found.normalSubtotal + plan + alcoholYen,
    };
  }
  return {
    key: `default::${tl}`,
    tableId: 'default',
    tableLabel: tl,
    orders: [],
    normalSubtotal: 0,
    normalCount: 0,
    nomihodaiCount: 0,
    nomihodaiPlanYen,
    alcoholChargeYen: alcoholYen,
    slipGrandTotal: nomihodaiPlanYen + alcoholYen,
  };
}

/** 注文履歴（全ステータス）＋稼働中NHプランから、税込の目安合計 */
function computeTableHistoryTotals(session, tableLabel, orders) {
  const tl = String(tableLabel);
  const list = Array.isArray(orders) ? orders : [];
  let normalSubtotal = 0;
  for (const o of list) {
    const yen = Math.max(0, Number(o.itemPrice) || 0);
    if (!o.isNomihodai) normalSubtotal += yen;
    else if (yen > 0) normalSubtotal += yen;
  }
  const nh = getNomihodaiForTable(session, tl);
  const nomihodaiPlanYen = nh?.active ? Math.max(0, Number(nh.billTotal) || 0) : 0;
  const ac = getAlcoholTableCharge(session, tl);
  return {
    normalSubtotal,
    nomihodaiPlanYen,
    alcoholChargeYen: ac.totalYen,
    grandTaxIn: normalSubtotal + nomihodaiPlanYen + ac.totalYen,
  };
}

export default function KitchenApp() {
  const {
    session,
    startNomihodai,
    endNomihodai,
    markOrderServed,
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

  /** 飲み放題希望サイン等から「各卓・伝票」タブへ */
  const openSlipTabWithNhOps = useCallback(() => {
    setStaffTab(STAFF_TABS.tableStatus);
  }, []);

  const handleVerbalOrderSubmitted = useCallback(
    ({ flow }) => {
      if (flow === 'kitchen') {
        setStaffTab(STAFF_TABS.orders);
        goToOrdersTab();
      }
    },
    [goToOrdersTab],
  );

  useEffect(() => {
    const nh = getNomihodaiForTable(session, session.tableLabel);
    if (!nh?.active) return;
    const lbl = String(session.tableLabel);
    setNhForm((prev) => ({
      ...prev,
      [lbl]: {
        men: Math.max(0, Number(nh.menCount) || 0),
        women: Math.max(0, Number(nh.womenCount) || 0),
      },
    }));
  }, [session.nomihodaiByLabel, session.tableLabel]);

  const allOrders = useMemo(() => session.orders, [session.orders]);
  /** 全卓共通：createdAt が古いほど先（上） */
  const pendingOrders = useMemo(
    () =>
      allOrders
        .filter((o) => o.status === 'pending')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    [allOrders]
  );

  /** 未提供キューに載っている卓に限り、注文一覧から飲み放題希望に応答する */
  const pendingTableLabelsSet = useMemo(
    () => new Set(pendingOrders.map((o) => String(o.tableLabel ?? session.tableLabel ?? '3'))),
    [pendingOrders, session.tableLabel]
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
    (label) => {
      const menC = Math.max(0, Number(nhForm[label]?.men) || 0);
      const womenC = Math.max(0, Number(nhForm[label]?.women) || 0);
      const people = Math.max(1, menC + womenC || 1);
      const planYen = menC * prices.men + womenC * prices.women || people * prices.men;
      if (
        !window.confirm(
          `卓${label}で飲み放題（90分）を開始しますか？\n\n男性 ${menC} 名・女性 ${womenC} 名\n税込プラン料金の目安：￥${planYen.toLocaleString()}\n\n※間違った卓でないか確認してください。`
        )
      ) {
        return;
      }
      startNomihodai({
        tableLabel: label,
        menCount: menC,
        womenCount: womenC,
      });
    },
    [nhForm, prices, startNomihodai]
  );

  const bumpNhFormCount = useCallback((label, field, delta) => {
    const key = field === 'men' ? 'men' : 'women';
    setNhForm((prev) => {
      const row = prev[label] || { men: 1, women: 1 };
      return {
        ...prev,
        [label]: {
          ...row,
          [key]: Math.max(0, (Number(row[key]) || 0) + delta),
        },
      };
    });
  }, []);

  const serveOrderBatch = useCallback(
    (orders) => {
      for (const o of orders) {
        void markOrderServed(o.id);
      }
    },
    [markOrderServed]
  );

  const pendingOrderBatches = useMemo(() => groupPendingOrderBatches(pendingOrders), [pendingOrders]);

  /** 卓ごと一括ボタン用：キューと同様、各卓の最古未提供が先になるよう卓を並べる */
  const pendingBulkTables = useMemo(() => {
    const map = new Map();
    for (const o of pendingOrders) {
      const lbl = String(o.tableLabel ?? session.tableLabel ?? '3');
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
    for (const label of TABLE_HERO_LABELS) {
      map.set(label, []);
    }
    for (const o of allOrders) {
      const lbl = String(o.tableLabel || session.tableLabel || '3');
      if (!map.has(lbl)) map.set(lbl, []);
      map.get(lbl).push(o);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return map;
  }, [allOrders, session.tableLabel]);

  const tableDetailTotals = useMemo(() => {
    if (!tableDetailLabel) return null;
    const orders = ordersByTableLabel.get(tableDetailLabel) || [];
    return computeTableHistoryTotals(session, tableDetailLabel, orders);
  }, [tableDetailLabel, ordersByTableLabel, session]);

  const servedByTable = useMemo(() => {
    const map = new Map();
    servedOrders.forEach((o) => {
      const tableId = o.tableId || session.tableId || 'default';
      const tableLabel = String(o.tableLabel || session.tableLabel || '3');
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
    return pendingOrders.filter((o) => String(o.tableLabel ?? session.tableLabel ?? '3') === tl).length;
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
      className={`kitchen-v2${staffTab === STAFF_TABS.retailTakeout ? ' kitchen-v2--retail-takeout' : ''}`}
    >
      <SupabaseConnectionBanner variant="kitchen" />
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
        <KitchenRealtimeBadge />
      </header>

      <StoreEntryUrlsPanel variant="kitchen" />

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
          onClick={() => setVerbalOrderTable(String(session.tableLabel || '1'))}
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
                                    onClick={() => handleConfirmStartNomihodai(label)}
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
                                          onClick={() => serveOrderBatch(batch.orders)}
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
                                        onClick={() => markOrderServed(o.id)}
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
                              onClick={() => markPendingServedForTable(t.tableId, t.tableLabel)}
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
                    <div className="kitchen-table-status-grid kitchen-table-status-grid--slip-board">
                      {TABLE_HERO_LABELS.map((label) => {
                        const list = ordersByTableLabel.get(label) || [];
                        const pendingList = list.filter((o) => o.status === 'pending');
                        const servedList = list.filter((o) => o.status === 'served');
                        const pendingN = pendingList.length;
                        const slip = resolveSlipBundleForTableLabel(servedByTable, session, label);
                        const nhLabel = getNomihodaiForTable(session, label);
                        const isNh = !!nhLabel?.active;
                        const isSessionTable = String(session.tableLabel) === label;
                        const row = nhForm[label] || { men: 1, women: 1 };
                        const nhMen =
                          isNh && nhLabel
                            ? Math.max(0, Number(nhLabel.menCount) || 0)
                            : Math.max(0, Number(row.men) || 0);
                        const nhWomen =
                          isNh && nhLabel
                            ? Math.max(0, Number(nhLabel.womenCount) || 0)
                            : Math.max(0, Number(row.women) || 0);
                        const autoExtendMinLocal =
                          isNh && nhLabel
                            ? Math.max(0, Math.ceil((Number(nhLabel.nextAutoExtendMs || nhLabel.endMs) - now) / 60000))
                            : null;
                        const extCnt = isNh && nhLabel ? Math.max(0, Number(nhLabel.extensionCount) || 0) : 0;
                        const intentGuest =
                          guestNomihodaiIntentLabels.includes(String(label)) && !isNh;
                        const intentHereWithQueue =
                          intentGuest && list.some((o) => o.status === 'pending');
                        const hasCheckoutReq = !!session.checkoutRequestByLabel?.[label];
                        return (
                          <article
                            key={label}
                            className={[
                              'kitchen-table-status',
                              'kitchen-table-status--slip-column',
                              isNh ? 'kitchen-table-status--nh' : '',
                              isSessionTable ? 'kitchen-table-status--session' : '',
                              intentGuest ? 'kitchen-table-status--nh-intent' : '',
                              intentHereWithQueue ? 'kitchen-table-status--nh-intent-queue' : '',
                              pendingN > 0 ? 'kitchen-table-status--has-pending' : '',
                              hasCheckoutReq ? 'kitchen-table-status--checkout-req' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <div className="kitchen-table-status__top">
                              <div className="kitchen-table-status__headline">
                                <span className="kitchen-table-status__table">TABLE {label}</span>
                                {isNh && nhLabel ? (
                                  <span className="kitchen-table-status__pill kitchen-table-status__pill--on">
                                    飲み放題中
                                  </span>
                                ) : (
                                  <span className="kitchen-table-status__pill kitchen-table-status__pill--off">
                                    通常
                                  </span>
                                )}
                              </div>
                              {pendingN > 0 || hasCheckoutReq || intentGuest || isSessionTable ? (
                                <div className="kitchen-table-status__quick" aria-label="卓の状態">
                                  {isSessionTable ? (
                                    <span className="kitchen-table-status__quick-pill kitchen-table-status__quick-pill--session">
                                      表示卓
                                    </span>
                                  ) : null}
                                  {pendingN > 0 ? (
                                    <span className="kitchen-table-status__quick-pill kitchen-table-status__quick-pill--pending">
                                      未提供 {pendingN}
                                    </span>
                                  ) : null}
                                  {hasCheckoutReq ? (
                                    <span className="kitchen-table-status__quick-pill kitchen-table-status__quick-pill--checkout">
                                      会計依頼
                                    </span>
                                  ) : null}
                                  {intentGuest ? (
                                    <span className="kitchen-table-status__quick-pill kitchen-table-status__quick-pill--intent">
                                      NH希望
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              <label className="kitchen-table-status__memo-wrap">
                                <span className="kitchen-table-status__memo-label">メモ</span>
                                <input
                                  type="text"
                                  className="kitchen-table-status__memo"
                                  value={session.tableMemoByLabel?.[label] ?? ''}
                                  onChange={(e) => setTableMemo(label, e.target.value)}
                                  maxLength={TABLE_MEMO_MAX_LEN}
                                  placeholder="氏名など（任意）"
                                  autoComplete="off"
                                  aria-label={`卓${label}メモ`}
                                />
                              </label>
                            </div>

                            <div className="kitchen-table-status__slip-controls">
                              <KitchenTableNhQuickPanel
                                tableLabel={label}
                                men={nhMen}
                                women={nhWomen}
                                prices={prices}
                                isNh={isNh}
                                intentPulse={intentHereWithQueue || intentGuest}
                                onBumpMen={(d) => bumpNhFormCount(label, 'men', d)}
                                onBumpWomen={(d) => bumpNhFormCount(label, 'women', d)}
                                onStart={() => handleConfirmStartNomihodai(label)}
                                onStop={() => {
                                  if (window.confirm('飲み放題を停止しますか？')) endNomihodai(label);
                                }}
                                isSessionTable={isSessionTable}
                                onSyncTable={() => {
                                  if (
                                    !window.confirm(
                                      `この端末の「表示卓・客席の注文卓番」を卓${label}に切り替えますか？\n\n※別卓の注文と混ざらないよう、卓番をよく確認してください。`
                                    )
                                  ) {
                                    return;
                                  }
                                  setSessionTableLabel(label);
                                }}
                              />
                              <KitchenTableAlcoholChargePanel
                                tableLabel={label}
                                session={session}
                                setTableAlcoholCharge={setTableAlcoholCharge}
                                now={now}
                              />
                            </div>

                            {intentHereWithQueue ? (
                              <div className="kitchen-table-status__notify kitchen-table-status__notify--intent" role="status">
                                <div>
                                  <strong>通知：</strong>
                                  この卓の客席から飲み放題希望です（未提供あり）。下の「飲み放題・卓操作」から開くか、
                                  <strong>「注文一覧」</strong>タブからも開始できます。人数を確認して「飲み放題開始」を押すと応答します。
                                </div>
                                <div className="kitchen-table-status__notify-actions">
                                  <button
                                    type="button"
                                    className="kitchen-table-status__notify-goto-slip"
                                    onClick={() => openSlipTabWithNhOps(label)}
                                  >
                                    この卓の操作を開く
                                  </button>
                                  <button
                                    type="button"
                                    className="kitchen-table-status__notify-dismiss"
                                    onClick={() => clearNomihodaiGuestIntent(label)}
                                  >
                                    希望を閉じる
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {session.checkoutRequestByLabel?.[label] ? (
                              <div className="kitchen-table-status__notify kitchen-table-status__notify--checkout" role="alert">
                                <strong>お会計依頼</strong>
                                客席から「お会計する」が届いています。この卓の<strong>会計</strong>ボタン、上部の<strong>お会計依頼</strong>、またはバナーの<strong>会計ページへ</strong>から確定できます。
                                <button
                                  type="button"
                                  className="kitchen-table-status__notify-dismiss"
                                  onClick={() => clearCheckoutRequestForTable(label)}
                                >
                                  依頼だけ消す
                                </button>
                              </div>
                            ) : null}

                            {session.guestFarewellActiveByLabel?.[label] ? (
                              <div className="kitchen-table-status__bussing" role="region" aria-label="卓タブレット再利用">
                                <p className="kitchen-table-status__bussing-text">
                                  客席の飲み放題タブに「お会計完了／退席案内」が表示されています。バッシング完了後に押すと、卓タブレットを次のお客様用に戻せます。
                                </p>
                                <button
                                  type="button"
                                  className="kitchen-table-status__bussing-btn"
                                  onClick={() => {
                                    if (
                                      !window.confirm(
                                        `卓${label}のタブレット表示をリセットし、飲み放題タブを再利用可能にしますか？`
                                      )
                                    ) {
                                      return;
                                    }
                                    void clearGuestFarewellForReuse(label);
                                  }}
                                >
                                  バッシング完了・卓タブレット再利用
                                </button>
                              </div>
                            ) : null}

                            {isNh && nhLabel ? (
                              <p className="kitchen-table-status__time">
                                {fmtTime(nhLabel.startMs)}〜{fmtTime(nhLabel.endMs)}
                              </p>
                            ) : (
                              <p className="kitchen-table-status__time kitchen-table-status__time--muted">
                                —
                              </p>
                            )}

                            {isNh && nhLabel ? (
                              <p className="kitchen-table-status__autoext">
                                自動延長まで 約 <strong>{autoExtendMinLocal ?? '—'}</strong> 分 ／ 延長{' '}
                                <strong>{extCnt}</strong> 回 ／ プラン{' '}
                                <strong>￥{nhLabel.billTotal.toLocaleString()}</strong>
                              </p>
                            ) : null}

                            <section className="kitchen-table-status__orders" aria-label="注文と伝票">
                              {pendingList.length > 0 ? (
                                <>
                                  <h3 className="kitchen-table-status__orders-heading">未提供</h3>
                                  <ul className="kitchen-table-status__hist-list">
                                    {pendingList.map((o) => {
                                      const meta = orderKindMeta(o);
                                      return (
                                        <li key={o.id} className="kitchen-table-status__hist-row">
                                          <span aria-hidden>{meta.emoji}</span>
                                          <span className="kitchen-table-status__hist-name">{meta.firstLine}</span>
                                          <span className="kitchen-table-status__st kitchen-table-status__st--wait">
                                            未提供
                                          </span>
                                          <button
                                            type="button"
                                            className="kitchen-table-status__hist-serve"
                                            onClick={() => markOrderServed(o.id)}
                                          >
                                            提供済
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </>
                              ) : null}
                              {servedList.length > 0 ? (
                                <>
                                  <h3 className="kitchen-table-status__orders-heading">提供済・伝票</h3>
                                  <ul className="kitchen-table-status__slip-list">
                                    {servedList.map((o) => (
                                      <li
                                        key={o.id}
                                        className={`kitchen-table-status__slip-row${
                                          isNomihodaiChargedExtra(o) ? ' kitchen-table-status__slip-row--nh-extra' : ''
                                        }`}
                                      >
                                        <div className="kitchen-table-status__slip-main">
                                          <span className="kitchen-table-status__slip-name">{o.itemName}</span>
                                          <span className="kitchen-table-status__slip-meta">
                                            {orderLineSlipMetaPrice(o)} /{' '}
                                            {o.createdAt ? fmtTime(o.createdAt) : '--:--'}
                                          </span>
                                        </div>
                                        <OrderBillingToggle
                                          orderId={o.id}
                                          isNomihodai={nhToggleShowsNomihodaiActive(o)}
                                          onSetNomihodai={setOrderIsNomihodai}
                                          compact
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : null}
                              {pendingList.length === 0 && servedList.length === 0 ? (
                                <p className="kitchen-table-status__orders-empty">注文・伝票明細はまだありません</p>
                              ) : null}
                              {pendingN > 0 ? (
                                <p className="kitchen-table-status__alert">未提供 {pendingN} 件あり</p>
                              ) : null}
                            </section>

                            <div className="kitchen-slip-total kitchen-slip-total--in-card">
                              <div>通常提供 {slip.normalCount}点</div>
                              <div>飲み放題提供 {slip.nomihodaiCount}点</div>
                              <div>通常小計（税込）￥{slip.normalSubtotal.toLocaleString()}</div>
                              {slip.nomihodaiPlanYen > 0 ? (
                                <div>飲み放題プラン（税込）￥{slip.nomihodaiPlanYen.toLocaleString()}</div>
                              ) : null}
                              {(slip.alcoholChargeYen ?? 0) > 0 ? (
                                <div className="kitchen-slip-total__alcohol">
                                  {getAlcoholTableCharge(session, label).lineName} ￥
                                  {(slip.alcoholChargeYen ?? 0).toLocaleString()}
                                </div>
                              ) : null}
                              <strong>合計（税込）￥{slip.slipGrandTotal.toLocaleString()}</strong>
                            </div>

                            <div className="kitchen-table-status__foot">
                              <button
                                type="button"
                                className="kitchen-table-status__verbal"
                                onClick={() => setVerbalOrderTable(label)}
                              >
                                口頭注文
                              </button>
                              {canUsePassPrnt() ? (
                                <button
                                  type="button"
                                  className="kitchen-table-status__print-slip"
                                  onClick={() =>
                                    printReceiptWithFeedback(
                                      buildSlipReceiptPayload({
                                        checkoutSlip: slip,
                                        session,
                                        tableLabel: label,
                                        memo: session.tableMemoByLabel?.[label] ?? '',
                                        payment: 'detail',
                                      }),
                                      { openDrawer: false }
                                    )
                                  }
                                >
                                  明細印刷
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="kitchen-btn kitchen-btn--checkout kitchen-table-status__checkout"
                                disabled={
                                  slip.normalCount + slip.nomihodaiCount === 0 &&
                                  slip.nomihodaiPlanYen <= 0 &&
                                  (slip.alcoholChargeYen ?? 0) <= 0
                                }
                                onClick={() => setCheckoutPage({ tableId: slip.tableId, tableLabel: slip.tableLabel })}
                              >
                                会計
                              </button>
                              <button
                                type="button"
                                className="kitchen-table-status__detail"
                                onClick={() => setTableDetailLabel(label)}
                              >
                                全履歴
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
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
                            onClick={() => markOrderServed(o.id)}
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
