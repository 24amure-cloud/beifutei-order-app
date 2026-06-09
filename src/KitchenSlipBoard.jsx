import React, { useEffect, useMemo, useState } from 'react';
import {
  ALCOHOL_CHARGE_BEFORE_21_YEN,
  alcoholChargeYenPerPersonFromNow,
  getAlcoholTableCharge,
} from './alcoholTableCharge.js';
import { getNomihodaiForTable, TABLE_MEMO_MAX_LEN } from './nomihodaiSession.js';
import KitchenSwipeDeleteRow from './KitchenSwipeDeleteRow.jsx';
import KitchenReceiptPreviewButton from './KitchenReceiptPreviewButton.jsx';
import {
  buildSlipReceiptPayload,
  canUsePassPrnt,
  printReceiptWithFeedback,
} from './receiptPrint.js';
import {
  isNomihodaiChargedExtra,
  nhToggleShowsNomihodaiActive,
  orderKindMeta,
  orderLineSlipMetaPrice,
} from './kitchenOrderDisplay.js';
import { resolveSlipBundleForTableLabel } from './kitchenSlipBundle.js';

function fmtTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

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

function KitchenTableAlcoholChargePanel({ tableLabel, session, setTableAlcoholCharge, now }) {
  const cur = getAlcoholTableCharge(session, tableLabel);
  const [peopleStr, setPeopleStr] = useState('1');
  const [yenStr, setYenStr] = useState(String(ALCOHOL_CHARGE_BEFORE_21_YEN));
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

  const onApply = () => {
    const pe = Math.max(1, Math.min(99, Number(peopleStr) || 1));
    const yp = Math.max(0, Math.min(999999, Math.floor(Number(String(yenStr).replace(/[^\d]/g, '')) || 0)));
    if (yp <= 0) {
      void setTableAlcoholCharge(tableLabel, { people: 0, yenPerPerson: 0 });
      return;
    }
    void setTableAlcoholCharge(tableLabel, { people: pe, yenPerPerson: yp });
  };

  const onClear = () => {
    void setTableAlcoholCharge(tableLabel, { people: 0, yenPerPerson: 0 });
  };

  return (
    <details className="kitchen-table-status__alcohol-block">
      <summary className="kitchen-table-status__alcohol-summary">
        <span className="kitchen-table-status__alcohol-summary-title">卓チャージ（税込）</span>
        {cur.totalYen > 0 ? (
          <span className="kitchen-table-status__alcohol-summary-value">￥{cur.totalYen.toLocaleString()}</span>
        ) : (
          <span className="kitchen-table-status__alcohol-summary-value kitchen-table-status__alcohol-summary-value--muted">
            未設定
          </span>
        )}
      </summary>
      <div className="kitchen-table-status__alcohol">
        <div className="kitchen-table-status__alcohol-row">
          <label className="kitchen-table-status__alcohol-people kitchen-table-status__alcohol-people--count">
            <span className="kitchen-table-status__alcohol-people-label">人数</span>
            <span className="kitchen-table-status__alcohol-stepper">
              <button type="button" className="kitchen-table-status__alcohol-stepbtn" onClick={() => bumpPeople(-1)} aria-label="人数を1減らす">
                −
              </button>
              <input type="number" min={1} max={99} value={peopleStr} onChange={(e) => setPeopleStr(e.target.value)} aria-label="チャージ対象人数" />
              <button type="button" className="kitchen-table-status__alcohol-stepbtn" onClick={() => bumpPeople(1)} aria-label="人数を1増やす">
                ＋
              </button>
            </span>
          </label>
          <label className="kitchen-table-status__alcohol-people">
            1名（円）
            <input type="number" min={0} max={999999} className="kitchen-table-status__alcohol-input--yen" value={yenStr} onChange={(e) => setYenStr(e.target.value)} aria-label="卓チャージ1名あたり金額" />
          </label>
          <button type="button" className="kitchen-table-status__alcohol-apply" onClick={onApply}>
            反映
          </button>
          <button type="button" className="kitchen-table-status__alcohol-clear" onClick={onClear}>
            クリア
          </button>
        </div>
      </div>
    </details>
  );
}

function KitchenSlipBoardPicker({ labels, pickerMeta, selectedLabel, onSelectLabel }) {
  return (
    <nav className="kitchen-slip-board-picker" aria-label="卓を選ぶ">
      {labels.map((label) => {
        const meta = pickerMeta.get(label) || {};
        const isSelected = selectedLabel === label;
        return (
          <button
            key={label}
            type="button"
            className={[
              'kitchen-slip-board-picker__btn',
              isSelected ? 'is-selected' : '',
              meta.hasCheckoutReq ? 'kitchen-slip-board-picker__btn--checkout' : '',
              meta.pendingN > 0 ? 'kitchen-slip-board-picker__btn--pending' : '',
              meta.intentGuest ? 'kitchen-slip-board-picker__btn--intent' : '',
              meta.isNh ? 'kitchen-slip-board-picker__btn--nh' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isSelected ? 'true' : undefined}
            onClick={() => onSelectLabel(label)}
          >
            <span className="kitchen-slip-board-picker__num">卓{label}</span>
            <span className="kitchen-slip-board-picker__badges">
              {meta.pendingN > 0 ? <span className="kitchen-slip-board-picker__badge kitchen-slip-board-picker__badge--pending">未{meta.pendingN}</span> : null}
              {meta.hasCheckoutReq ? <span className="kitchen-slip-board-picker__badge kitchen-slip-board-picker__badge--checkout">会計</span> : null}
              {meta.intentGuest ? <span className="kitchen-slip-board-picker__badge kitchen-slip-board-picker__badge--intent">NH</span> : null}
              {meta.isNh ? <span className="kitchen-slip-board-picker__badge kitchen-slip-board-picker__badge--nh">放題</span> : null}
            </span>
            <span className="kitchen-slip-board-picker__yen">
              {meta.slipGrandTotal > 0 ? `￥${meta.slipGrandTotal.toLocaleString()}` : '—'}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function KitchenSlipTableDetail({
  label,
  ordersByTableLabel,
  servedByTable,
  session,
  now,
  prices,
  nhForm,
  setNhForm,
  tableNhOpsOpen,
  setTableNhOpsOpen,
  staffFocusTableLabel,
  guestNomihodaiIntentLabels,
  setTableMemo,
  setTableAlcoholCharge,
  setSessionTableLabel,
  clearNomihodaiGuestIntent,
  clearCheckoutRequestForTable,
  clearGuestFarewellForReuse,
  endNomihodai,
  handleConfirmStartNomihodai,
  handleMarkServed,
  servePendingForTable,
  handleRemoveOrder,
  setOrderIsNomihodai,
  setCheckoutPage,
  setVerbalOrderTable,
  openSlipTabWithNhOps,
}) {
  const list = ordersByTableLabel.get(label) || [];
  const pendingList = list.filter((o) => o.status === 'pending');
  const servedList = list.filter((o) => o.status === 'served');
  const pendingN = pendingList.length;
  const slip = resolveSlipBundleForTableLabel(servedByTable, session, label);
  const nhLabel = getNomihodaiForTable(session, label);
  const isNh = !!nhLabel?.active;
  const isSessionTable = staffFocusTableLabel !== '' && staffFocusTableLabel === label;
  const row = nhForm[label] || { men: 1, women: 1 };
  const autoExtendMinLocal =
    isNh && nhLabel ? Math.max(0, Math.ceil((Number(nhLabel.nextAutoExtendMs || nhLabel.endMs) - now) / 60000)) : null;
  const extCnt = isNh && nhLabel ? Math.max(0, Number(nhLabel.extensionCount) || 0) : 0;
  const intentGuest = guestNomihodaiIntentLabels.includes(String(label)) && !isNh;
  const intentHereWithQueue = intentGuest && list.some((o) => o.status === 'pending');
  const hasCheckoutReq = !!session.checkoutRequestByLabel?.[label];

  return (
    <article
      className={[
        'kitchen-table-status',
        'kitchen-table-status--slip-board-card',
        'kitchen-table-status--slip-detail',
        isNh ? 'kitchen-table-status--nh' : '',
        isSessionTable ? 'kitchen-table-status--session' : '',
        intentHereWithQueue ? 'kitchen-table-status--nh-intent' : '',
        intentGuest ? 'kitchen-table-status--nh-intent-guest' : '',
        pendingN > 0 ? 'kitchen-table-status--has-pending' : '',
        hasCheckoutReq ? 'kitchen-table-status--checkout-req' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="kitchen-table-status__top kitchen-table-status__top--detail">
        <div className="kitchen-table-status__headline">
          <span className="kitchen-table-status__table">卓 {label}</span>
          {isNh && nhLabel ? (
            <span className="kitchen-table-status__pill kitchen-table-status__pill--on">飲み放題中</span>
          ) : (
            <span className="kitchen-table-status__pill kitchen-table-status__pill--off">通常</span>
          )}
        </div>
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
        <div className="kitchen-table-status__detail-actions">
          <button
            type="button"
            className="kitchen-btn kitchen-btn--checkout kitchen-table-status__checkout kitchen-table-status__checkout--detail"
            disabled={
              slip.normalCount + slip.nomihodaiCount === 0 &&
              slip.nomihodaiPlanYen <= 0 &&
              (slip.alcoholChargeYen ?? 0) <= 0
            }
            onClick={() => setCheckoutPage({ tableId: slip.tableId, tableLabel: slip.tableLabel })}
          >
            会計
          </button>
          <button type="button" className="kitchen-table-status__verbal" onClick={() => setVerbalOrderTable(label)}>
            口頭
          </button>
        </div>
      </div>

      <KitchenTableAlcoholChargePanel tableLabel={label} session={session} setTableAlcoholCharge={setTableAlcoholCharge} now={now} />

      {hasCheckoutReq ? (
        <div className="kitchen-table-status__notify kitchen-table-status__notify--checkout kitchen-table-status__notify--compact" role="alert">
          <strong>お会計依頼あり</strong>
          <button type="button" className="kitchen-table-status__notify-dismiss" onClick={() => clearCheckoutRequestForTable(label)}>
            依頼を消す
          </button>
        </div>
      ) : null}

      {intentHereWithQueue ? (
        <div className="kitchen-table-status__notify kitchen-table-status__notify--intent kitchen-table-status__notify--compact" role="status">
          <strong>飲み放題希望</strong>（未提供あり）
          <button type="button" className="kitchen-table-status__notify-goto-slip" onClick={() => openSlipTabWithNhOps(label)}>
            操作を開く
          </button>
        </div>
      ) : null}

      {session.guestFarewellActiveByLabel?.[label] ? (
        <div className="kitchen-table-status__bussing kitchen-table-status__bussing--compact" role="region" aria-label="卓タブレット再利用">
          <button
            type="button"
            className="kitchen-table-status__bussing-btn"
            onClick={() => {
              if (!window.confirm(`卓${label}のタブレット表示をリセットし、飲み放題タブを再利用可能にしますか？`)) return;
              void clearGuestFarewellForReuse(label);
            }}
          >
            バッシング完了・再利用
          </button>
        </div>
      ) : null}

      {isNh && nhLabel ? (
        <p className="kitchen-table-status__time">
          {fmtTime(nhLabel.startMs)}〜{fmtTime(nhLabel.endMs)}
          <span className="kitchen-table-status__autoext-inline">
            ／ 延長まで約{autoExtendMinLocal ?? '—'}分 ／ 延長{extCnt}回 ／ ￥{nhLabel.billTotal.toLocaleString()}
          </span>
        </p>
      ) : null}

      {tableNhOpsOpen === label ? (
        <div className="kitchen-table-status__ops-panel">
          <div className="kitchen-table-status__ops-panel-head">
            <span className="kitchen-table-status__ops-panel-title">飲み放題・卓操作</span>
            <button type="button" className="kitchen-table-status__ops-close" onClick={() => setTableNhOpsOpen(null)}>
              閉じる
            </button>
          </div>
          {!isSessionTable ? (
            <button
              type="button"
              className="kitchen-table-status__sync"
              onClick={() => {
                if (!window.confirm(`この端末の表示卓を卓${label}に切り替えますか？`)) return;
                setSessionTableLabel(label);
              }}
            >
              この卓に切り替え
            </button>
          ) : (
            <p className="kitchen-table-status__session-note">現在のセッション卓</p>
          )}
          <div className="kitchen-table-status__nhops">
            <div className="kitchen-table-status__nh-row">
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
                      [label]: { ...(prev[label] || { men: 1, women: 1 }), men: Math.max(0, Number(e.target.value) || 0) },
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
                      [label]: { ...(prev[label] || { men: 1, women: 1 }), women: Math.max(0, Number(e.target.value) || 0) },
                    }))
                  }
                />
              </label>
            </div>
            <div className="kitchen-table-status__nh-btns">
              <button
                type="button"
                className={`kitchen-table-status__nh-start${intentHereWithQueue || intentGuest ? ' kitchen-table-status__nh-start--pulse' : ''}`}
                disabled={!!nhLabel?.active}
                onClick={() => void handleConfirmStartNomihodai(label)}
              >
                飲み放題開始（90分）
              </button>
              <button
                type="button"
                className="kitchen-table-status__nh-stop"
                disabled={!isNh}
                onClick={() => {
                  if (window.confirm('飲み放題を停止しますか？')) endNomihodai(label);
                }}
              >
                飲み放題停止
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`kitchen-table-status__ops-trigger${intentGuest ? ' kitchen-table-status__ops-trigger--intent' : ''}`}
          onClick={() => openSlipTabWithNhOps(label)}
        >
          <span className="kitchen-table-status__ops-trigger-title">飲み放題・卓操作</span>
          {intentGuest ? <span className="kitchen-table-status__ops-trigger-badge">希望あり</span> : null}
        </button>
      )}

      <section className="kitchen-table-status__orders kitchen-table-status__orders--detail" aria-label="注文と伝票">
        {pendingList.length > 0 ? (
          <>
            <div className="kitchen-table-status__orders-toolbar">
              <h3 className="kitchen-table-status__orders-heading">未提供 {pendingN}</h3>
              <button type="button" className="kitchen-table-status__serve-all-pending" onClick={() => void servePendingForTable(pendingList)}>
                すべて提供済
              </button>
            </div>
            <ul className="kitchen-table-status__hist-list">
              {pendingList.map((o) => {
                const meta = orderKindMeta(o);
                return (
                  <li key={o.id}>
                    <KitchenSwipeDeleteRow className="kitchen-swipe-row--hist" surfaceClassName="kitchen-table-status__hist-row kitchen-table-status__hist-row--detail" onDelete={() => void handleRemoveOrder(o)}>
                      <span aria-hidden>{meta.emoji}</span>
                      <span className="kitchen-table-status__hist-name">{meta.firstLine}</span>
                      <button type="button" className="kitchen-table-status__hist-serve" onClick={() => void handleMarkServed(o.id)}>
                        提供済
                      </button>
                    </KitchenSwipeDeleteRow>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
        {servedList.length > 0 ? (
          <>
            <h3 className="kitchen-table-status__orders-heading">提供済・伝票 {servedList.length}点</h3>
            <ul className="kitchen-table-status__slip-list">
              {servedList.map((o) => (
                <li key={o.id}>
                  <KitchenSwipeDeleteRow
                    className="kitchen-swipe-row--slip"
                    surfaceClassName={`kitchen-table-status__slip-row kitchen-table-status__slip-row--detail${
                      isNomihodaiChargedExtra(o) ? ' kitchen-table-status__slip-row--nh-extra' : ''
                    }`}
                    onDelete={() => void handleRemoveOrder(o)}
                  >
                    <div className="kitchen-table-status__slip-main">
                      <span className="kitchen-table-status__slip-name">{o.itemName}</span>
                      <span className="kitchen-table-status__slip-meta">
                        {orderLineSlipMetaPrice(o)} / {o.createdAt ? fmtTime(o.createdAt) : '--:--'}
                      </span>
                    </div>
                    <OrderBillingToggle orderId={o.id} isNomihodai={nhToggleShowsNomihodaiActive(o)} onSetNomihodai={setOrderIsNomihodai} compact />
                  </KitchenSwipeDeleteRow>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {pendingList.length === 0 && servedList.length === 0 ? (
          <p className="kitchen-table-status__orders-empty">注文・伝票明細はまだありません</p>
        ) : null}
      </section>

      <footer className="kitchen-slip-detail-foot">
        <details className="kitchen-slip-total kitchen-slip-total--in-card kitchen-slip-total--fold">
          <summary className="kitchen-slip-total__summary">
            <span className="kitchen-slip-total__summary-label">合計（税込）</span>
            <strong className="kitchen-slip-total__summary-yen">￥{slip.slipGrandTotal.toLocaleString()}</strong>
          </summary>
          <div className="kitchen-slip-total__breakdown">
            <div>通常提供 {slip.normalCount}点</div>
            <div>飲み放題提供 {slip.nomihodaiCount}点</div>
            <div>通常小計（税込）￥{slip.normalSubtotal.toLocaleString()}</div>
            {slip.nomihodaiPlanYen > 0 ? <div>飲み放題プラン（税込）￥{slip.nomihodaiPlanYen.toLocaleString()}</div> : null}
            {(slip.alcoholChargeYen ?? 0) > 0 ? (
              <div className="kitchen-slip-total__alcohol">
                {getAlcoholTableCharge(session, label).lineName} ￥{(slip.alcoholChargeYen ?? 0).toLocaleString()}
              </div>
            ) : null}
          </div>
        </details>
        <div className="kitchen-slip-detail-foot__print">
          <KitchenReceiptPreviewButton
            compact
            label="プレビュー"
            payload={buildSlipReceiptPayload({
              checkoutSlip: slip,
              session,
              tableLabel: label,
              memo: session.tableMemoByLabel?.[label] ?? '',
              payment: 'detail',
            })}
          />
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
                  { openDrawer: false },
                )
              }
            >
              印刷
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

export default function KitchenSlipBoard({
  labels,
  selectedLabel,
  onSelectLabel,
  pickerMeta,
  ordersByTableLabel,
  servedByTable,
  session,
  now,
  prices,
  nhForm,
  setNhForm,
  tableNhOpsOpen,
  setTableNhOpsOpen,
  staffFocusTableLabel,
  guestNomihodaiIntentLabels,
  setTableMemo,
  setTableAlcoholCharge,
  setSessionTableLabel,
  clearNomihodaiGuestIntent,
  clearCheckoutRequestForTable,
  clearGuestFarewellForReuse,
  endNomihodai,
  handleConfirmStartNomihodai,
  handleMarkServed,
  servePendingForTable,
  handleRemoveOrder,
  setOrderIsNomihodai,
  setCheckoutPage,
  setVerbalOrderTable,
  openSlipTabWithNhOps,
}) {
  if (!selectedLabel) return null;

  return (
    <div className="kitchen-slip-board-layout">
      <KitchenSlipBoardPicker labels={labels} pickerMeta={pickerMeta} selectedLabel={selectedLabel} onSelectLabel={onSelectLabel} />
      <div className="kitchen-slip-board-detail">
        <KitchenSlipTableDetail
          label={selectedLabel}
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
          servePendingForTable={servePendingForTable}
          handleRemoveOrder={handleRemoveOrder}
          setOrderIsNomihodai={setOrderIsNomihodai}
          setCheckoutPage={setCheckoutPage}
          setVerbalOrderTable={setVerbalOrderTable}
          openSlipTabWithNhOps={openSlipTabWithNhOps}
        />
      </div>
    </div>
  );
}
