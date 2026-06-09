import React, { useEffect, useMemo, useState } from 'react';
import { getAlcoholTableCharge } from './alcoholTableCharge.js';
import { formatLedgerPaymentJa } from './dailyLedger.js';
import {
  isNomihodaiChargedExtra,
  orderKindMeta,
  orderLineTaxInLabel,
} from './kitchenOrderDisplay.js';
import KitchenReceiptPreviewButton from './KitchenReceiptPreviewButton.jsx';
import {
  buildSlipReceiptPayload,
  canUsePassPrnt,
  printReceiptWithFeedback,
  RECEIPT_STORE,
} from './receiptPrint.js';

function card5Total(base) {
  return Math.ceil(Math.max(0, Number(base) || 0) * 1.05);
}

/** お釣り計算用：ぴったり＋よく使う札の候補 */
function buildCashQuickAmounts(due) {
  const yen = Math.max(0, Math.round(Number(due) || 0));
  const set = new Set([yen]);
  for (const bill of [1000, 2000, 5000, 10000]) {
    if (bill >= yen) set.add(bill);
  }
  for (const step of [100, 500, 1000, 5000]) {
    const rounded = Math.ceil(yen / step) * step;
    if (rounded >= yen) set.add(rounded);
  }
  return [...set].sort((a, b) => a - b).slice(0, 7);
}

function parseCashInput(raw) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Math.min(9_999_999, Number(digits));
}

/**
 * 会計フロー：①お客様へ伝票提示 → ②お支払い確定 → ③レシート印刷の確認
 */
export default function KitchenCheckoutModal({
  tableLabel,
  checkoutSlip,
  session,
  memo,
  pendingCount,
  hasCheckoutRequest,
  onClose,
  onEditSlip,
  onFinalize,
  onComplete,
}) {
  const [step, setStep] = useState('present');
  const [paying, setPaying] = useState(false);
  const [completed, setCompleted] = useState(null);
  const [cashReceived, setCashReceived] = useState('');

  useEffect(() => {
    setStep('present');
    setPaying(false);
    setCompleted(null);
    setCashReceived('');
  }, [tableLabel]);

  const grandTotal = checkoutSlip?.slipGrandTotal ?? 0;
  const card5Yen = card5Total(grandTotal);
  const receivedYen = parseCashInput(cashReceived);
  const cashChange = receivedYen - grandTotal;
  const cashReady = receivedYen >= grandTotal && grandTotal > 0;
  const cashQuickAmounts = useMemo(() => buildCashQuickAmounts(grandTotal), [grandTotal]);
  const alcoholLine = useMemo(() => {
    if (!tableLabel || (checkoutSlip?.alcoholChargeYen ?? 0) <= 0) return null;
    return getAlcoholTableCharge(session, tableLabel);
  }, [checkoutSlip?.alcoholChargeYen, session, tableLabel]);

  const slipPrintPayload = (payment) =>
    buildSlipReceiptPayload({
      checkoutSlip,
      session,
      tableLabel,
      memo,
      payment,
    });

  const handlePay = async (payment) => {
    if (paying) return;
    setPaying(true);
    const printPayload = slipPrintPayload(payment);
    const totalYen = payment === 'card_5pct' ? card5Yen : grandTotal;
    try {
      const res = await onFinalize(payment);
      if (!res?.ok) return;
      setCompleted({
        payment,
        printPayload,
        totalYen,
        paymentLabel: formatLedgerPaymentJa(payment),
      });
      setStep('done');
    } finally {
      setPaying(false);
    }
  };

  const finishWithoutPrint = () => {
    onComplete();
  };

  const finishWithPrint = () => {
    if (!completed?.printPayload) {
      onComplete();
      return;
    }
    const openDrawer = completed.payment === 'cash';
    printReceiptWithFeedback(completed.printPayload, { openDrawer, silentNotIos: false });
    onComplete();
  };


  if (!checkoutSlip && step !== 'done') return null;

  if (step === 'done' && completed) {
    const canPrint = canUsePassPrnt();
    return (
      <div className="kitchen-checkout-page-overlay" role="dialog" aria-modal="true" aria-labelledby="kitchen-checkout-done-title">
        <div className="kitchen-checkout-page kitchen-checkout-page--done">
          <header className="kitchen-checkout-done__head">
            <p className="kitchen-checkout-done__eyebrow">会計完了</p>
            <h2 id="kitchen-checkout-done-title" className="kitchen-checkout-done__title">
              {tableLabel}番卓
            </h2>
            <p className="kitchen-checkout-done__summary">
              <span className="kitchen-checkout-done__pay">{completed.paymentLabel}</span>
              <strong className="kitchen-checkout-done__yen">￥{completed.totalYen.toLocaleString()}</strong>
              <span className="kitchen-checkout-done__tax">（税込）</span>
            </p>
          </header>

          {canPrint ? (
            <section className="kitchen-checkout-done__print" aria-labelledby="kitchen-checkout-print-q">
              <h3 id="kitchen-checkout-print-q" className="kitchen-checkout-done__print-q">
                レシートを印刷しますか？
              </h3>
              <p className="kitchen-checkout-done__print-note">
                {completed.payment === 'cash'
                  ? '「印刷する」でレシートを出し、ドロワーを開きます。'
                  : '「印刷する」でお会計明細を印刷します（精算はスマレジ等のまま）。'}
              </p>
              <div className="kitchen-checkout-done__print-actions">
                <button type="button" className="kitchen-checkout-done__print-yes" onClick={finishWithPrint}>
                  印刷する
                </button>
                <KitchenReceiptPreviewButton
                  payload={completed.printPayload}
                  label="プレビュー"
                  className="kitchen-checkout-done__print-preview"
                />
                <button type="button" className="kitchen-checkout-done__print-no" onClick={finishWithoutPrint}>
                  印刷しない
                </button>
              </div>
            </section>
          ) : (
            <section className="kitchen-checkout-done__print kitchen-checkout-done__print--noop">
              <p className="kitchen-checkout-done__print-note">
                レシート印刷は iPad（PassPRNT）接続時のみ利用できます。デザインは「プレビュー」で確認できます。
              </p>
              <div className="kitchen-checkout-done__print-actions">
                <KitchenReceiptPreviewButton
                  payload={completed.printPayload}
                  label="レシートをプレビュー"
                  className="kitchen-checkout-done__print-preview"
                />
                <button type="button" className="kitchen-checkout-done__print-no kitchen-checkout-done__done-only" onClick={finishWithoutPrint}>
                  完了
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  if (step === 'present') {
    return (
      <div className="kitchen-checkout-guest-overlay" role="dialog" aria-modal="true" aria-labelledby="kitchen-checkout-guest-title">
        <div className="kitchen-checkout-guest">
          <header className="kitchen-checkout-guest__head">
            <p className="kitchen-checkout-guest__store">{RECEIPT_STORE.title}</p>
            <p className="kitchen-checkout-guest__store-sub">{RECEIPT_STORE.subtitle}</p>
            <h1 id="kitchen-checkout-guest-title" className="kitchen-checkout-guest__table">
              <span className="kitchen-checkout-guest__table-label">TABLE</span>
              <span className="kitchen-checkout-guest__table-num">{tableLabel}</span>
            </h1>
            <p className="kitchen-checkout-guest__tax-note">表示金額はすべて税込です</p>
            {hasCheckoutRequest ? (
              <span className="kitchen-checkout-guest__req-badge" role="status">
                お会計のご依頼あり
              </span>
            ) : null}
          </header>

          {memo ? (
            <p className="kitchen-checkout-guest__memo">
              <span className="kitchen-checkout-guest__memo-k">メモ</span>
              {memo}
            </p>
          ) : null}

          {pendingCount > 0 ? (
            <p className="kitchen-checkout-guest__staff-warn" role="note">
              ※スタッフ向け：未提供が{pendingCount}件あります
            </p>
          ) : null}

          <div className="kitchen-checkout-guest__scroll">
            {checkoutSlip.orders.length === 0 ? (
              <p className="kitchen-checkout-guest__empty">
                {(checkoutSlip.alcoholChargeYen ?? 0) > 0
                  ? '単品の提供済み明細はありません（チャージ等のみ）'
                  : '提供済みの単品明細はありません'}
              </p>
            ) : (
              <ul className="kitchen-checkout-guest__lines">
                {checkoutSlip.orders.map((o) => {
                  const meta = orderKindMeta(o);
                  const extra = isNomihodaiChargedExtra(o);
                  return (
                    <li
                      key={o.id}
                      className={`kitchen-checkout-guest__line${
                        extra ? ' kitchen-checkout-guest__line--extra' : ''
                      }`}
                    >
                      <span className="kitchen-checkout-guest__line-ico" aria-hidden>
                        {meta.emoji}
                      </span>
                      <span className="kitchen-checkout-guest__line-name">{meta.firstLine}</span>
                      <span className="kitchen-checkout-guest__line-price">{orderLineTaxInLabel(o)}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="kitchen-checkout-guest__breakdown">
              {checkoutSlip.normalCount > 0 ? (
                <div className="kitchen-checkout-guest__break-row">
                  <span>通常（{checkoutSlip.normalCount}点）</span>
                  <span>￥{checkoutSlip.normalSubtotal.toLocaleString()}</span>
                </div>
              ) : null}
              {checkoutSlip.nomihodaiCount > 0 ? (
                <div className="kitchen-checkout-guest__break-row">
                  <span>飲み放題内（{checkoutSlip.nomihodaiCount}点）</span>
                  <span className="kitchen-checkout-guest__break-muted">プランに含む</span>
                </div>
              ) : null}
              {checkoutSlip.nomihodaiPlanYen > 0 ? (
                <div className="kitchen-checkout-guest__break-row">
                  <span>飲み放題プラン</span>
                  <span>￥{checkoutSlip.nomihodaiPlanYen.toLocaleString()}</span>
                </div>
              ) : null}
              {alcoholLine && (checkoutSlip.alcoholChargeYen ?? 0) > 0 ? (
                <div className="kitchen-checkout-guest__break-row">
                  <span>{alcoholLine.lineName}</span>
                  <span>￥{(checkoutSlip.alcoholChargeYen ?? 0).toLocaleString()}</span>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="kitchen-checkout-guest__total-block">
            <p className="kitchen-checkout-guest__total-label">ご会計（税込）</p>
            <p className="kitchen-checkout-guest__total-yen" aria-live="polite">
              ￥{grandTotal.toLocaleString()}
            </p>
            <p className="kitchen-checkout-guest__card5-hint">
              カード・手数料5%（税込）：￥{card5Yen.toLocaleString()}
            </p>
          </footer>

          <div className="kitchen-checkout-guest__staff-bar">
            <button type="button" className="kitchen-checkout-guest__back" onClick={onClose}>
              戻る
            </button>
            <button
              type="button"
              className="kitchen-checkout-guest__proceed"
              onClick={() => setStep('pay')}
            >
              お支払いを受け取る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'cash') {
    return (
      <div
        className="kitchen-checkout-page-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kitchen-checkout-cash-title"
        onClick={onClose}
      >
        <div className="kitchen-checkout-page kitchen-checkout-page--cash" onClick={(e) => e.stopPropagation()}>
          <header className="kitchen-checkout-page__head">
            <div>
              <h2 id="kitchen-checkout-cash-title" className="kitchen-checkout-page__title">
                {tableLabel}番卓・現金
              </h2>
              <p className="kitchen-checkout-page__lead">お客様から受け取った金額を入れて、お釣りを確認してから確定してください。</p>
            </div>
          </header>

          <div className="kitchen-checkout-cash-due">
            <span className="kitchen-checkout-cash-due__lab">ご会計（税込）</span>
            <strong className="kitchen-checkout-cash-due__yen">￥{grandTotal.toLocaleString()}</strong>
          </div>

          <label className="kitchen-checkout-cash-input">
            <span className="kitchen-checkout-cash-input__lab">お預かり</span>
            <div className="kitchen-checkout-cash-input__row">
              <span className="kitchen-checkout-cash-input__prefix">￥</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="kitchen-checkout-cash-input__field"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="0"
                autoFocus
                aria-describedby="kitchen-checkout-cash-change"
              />
            </div>
          </label>

          <div className="kitchen-checkout-cash-quick" aria-label="よく使う金額">
            {cashQuickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`kitchen-checkout-cash-quick__btn${amt === grandTotal ? ' kitchen-checkout-cash-quick__btn--exact' : ''}`}
                onClick={() => setCashReceived(String(amt))}
              >
                {amt === grandTotal ? 'ぴったり' : `￥${amt.toLocaleString()}`}
              </button>
            ))}
          </div>

          <div
            id="kitchen-checkout-cash-change"
            className={`kitchen-checkout-cash-change${cashReady ? ' kitchen-checkout-cash-change--ok' : ''}${receivedYen > 0 && !cashReady ? ' kitchen-checkout-cash-change--short' : ''}`}
            aria-live="polite"
          >
            <span className="kitchen-checkout-cash-change__lab">お釣り</span>
            <strong className="kitchen-checkout-cash-change__yen">
              {receivedYen <= 0 ? '—' : cashReady ? `￥${cashChange.toLocaleString()}` : '不足'}
            </strong>
          </div>

          <div className="kitchen-checkout-cash-actions">
            <button
              type="button"
              className="kitchen-checkout-cash-confirm"
              disabled={paying || !cashReady}
              onClick={() => void handlePay('cash')}
            >
              {paying ? '確定中…' : '現金で会計を確定'}
            </button>
            <button
              type="button"
              className="kitchen-checkout-cash-back"
              disabled={paying}
              onClick={() => {
                setCashReceived('');
                setStep('pay');
              }}
            >
              支払い方法に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kitchen-checkout-page-overlay" role="dialog" aria-modal="true" aria-labelledby="kitchen-checkout-pay-title" onClick={onClose}>
      <div className="kitchen-checkout-page kitchen-checkout-page--pay" onClick={(e) => e.stopPropagation()}>
        <header className="kitchen-checkout-page__head">
          <div>
            <h2 id="kitchen-checkout-pay-title" className="kitchen-checkout-page__title">
              {tableLabel}番卓・お支払い
            </h2>
            <p className="kitchen-checkout-page__lead">
              お客様に伝票をご確認いただいたうえで、お支払い方法を選んで確定してください。
            </p>
          </div>
          {hasCheckoutRequest ? (
            <span className="kitchen-checkout-page__badge" role="status">
              お会計依頼中
            </span>
          ) : null}
        </header>

        <div className="kitchen-checkout-pay-recap">
          <button type="button" className="kitchen-checkout-pay-recap__show" onClick={() => setStep('present')}>
            ← お客様に伝票を見せる
          </button>
          <p className="kitchen-checkout-pay-recap__total">
            ご会計（税込）<strong>￥{grandTotal.toLocaleString()}</strong>
          </p>
        </div>

        {pendingCount > 0 ? (
          <div className="kitchen-checkout-page__warn">
            未提供が<strong>{pendingCount}件</strong>あります。会計前に提供状況を確認してください。
          </div>
        ) : null}

        <p className="kitchen-checkout-page__pay-hint">お支払い方法を選択して会計を確定</p>
        <div className="kitchen-checkout-paygrid kitchen-checkout-paygrid--3">
          <button
            type="button"
            className="kitchen-checkout-pay kitchen-checkout-pay--cash"
            disabled={paying}
            onClick={() => {
              setCashReceived('');
              setStep('cash');
            }}
          >
            <span className="kitchen-checkout-pay__label">現金</span>
            <span className="kitchen-checkout-pay__yen">￥{grandTotal.toLocaleString()}</span>
            <span className="kitchen-checkout-pay__sub">お釣り計算へ</span>
          </button>
          <button
            type="button"
            className="kitchen-checkout-pay kitchen-checkout-pay--card"
            disabled={paying}
            onClick={() => void handlePay('card')}
          >
            <span className="kitchen-checkout-pay__label">カード</span>
            <span className="kitchen-checkout-pay__yen">￥{grandTotal.toLocaleString()}</span>
            <span className="kitchen-checkout-pay__sub">税込・スマレジ等</span>
          </button>
          <button
            type="button"
            className="kitchen-checkout-pay kitchen-checkout-pay--card5"
            disabled={paying}
            onClick={() => void handlePay('card_5pct')}
          >
            <span className="kitchen-checkout-pay__label">カード＋5%</span>
            <span className="kitchen-checkout-pay__yen">￥{card5Yen.toLocaleString()}</span>
            <span className="kitchen-checkout-pay__sub">税込・手数料込</span>
          </button>
        </div>
        {paying ? <p className="kitchen-checkout-page__paying" role="status">会計を確定しています…</p> : null}

        <div className="kitchen-checkout-page__footer-actions">
          <button type="button" className="kitchen-checkout-page__linkbtn" onClick={onEditSlip} disabled={paying}>
            伝票タブで修正する
          </button>
          <button type="button" className="kitchen-checkout-cancel" onClick={onClose} disabled={paying}>
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
