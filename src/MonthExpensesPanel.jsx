import React, { useEffect, useMemo, useState } from 'react';
import {
  buildMonthSalesSummary,
  entriesForMonth,
  expenseAmountsTotal,
} from './monthCloseAnalytics.js';
import { getMonthClose } from './monthCloseStorage.js';
import {
  EXPENSE_LINE_DEFS,
  MONTH_EXPENSE_STORAGE_KEY,
  getMonthExpense,
  saveMonthExpense,
} from './monthExpenseStorage.js';
import { monthLabel, shiftMonthKey } from './monthNavHelpers.js';
import {
  DAILY_LEDGER_STORAGE_KEY,
  getLocalDateKey,
  loadDailyLedger,
  loadLedgerSettings,
} from './dailyLedger.js';
import LedgerDataNotice from './LedgerDataNotice.jsx';
import './monthExpenses.css';

function fmtYen(n) {
  return `￥${Math.max(0, Math.round(Number(n) || 0)).toLocaleString()}`;
}

function amountsToForm(rec) {
  const amounts = rec?.amounts || {};
  const out = {};
  for (const { key } of EXPENSE_LINE_DEFS) {
    const n = Number(amounts[key]);
    out[key] = Number.isFinite(n) && n > 0 ? String(n) : '';
  }
  return out;
}

export default function MonthExpensesPanel() {
  const todayKey = getLocalDateKey();
  const [monthCursor, setMonthCursor] = useState(() => todayKey.slice(0, 7));
  const [tick, setTick] = useState(0);
  const [amounts, setAmounts] = useState(() => amountsToForm(null));
  const [memo, setMemo] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const refresh = () => setTick((x) => x + 1);
    const onStorage = (e) => {
      if (e.key === DAILY_LEDGER_STORAGE_KEY || e.key === MONTH_EXPENSE_STORAGE_KEY || e.key === null) {
        refresh();
      }
    };
    window.addEventListener('beifutei-daily-ledger-updated', refresh);
    window.addEventListener('beifutei-daily-ledger-synced', refresh);
    window.addEventListener('beifutei-month-expenses-updated', refresh);
    window.addEventListener('beifutei-month-close-updated', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-daily-ledger-updated', refresh);
      window.removeEventListener('beifutei-daily-ledger-synced', refresh);
      window.removeEventListener('beifutei-month-expenses-updated', refresh);
      window.removeEventListener('beifutei-month-close-updated', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const entries = useMemo(() => loadDailyLedger().entries, [tick]);
  const monthEntries = useMemo(() => entriesForMonth(entries, monthCursor), [entries, monthCursor]);
  const summary = useMemo(() => buildMonthSalesSummary(monthEntries), [monthEntries]);
  const confirmed = useMemo(() => getMonthClose(monthCursor), [monthCursor, tick]);
  const savedExpense = useMemo(() => getMonthExpense(monthCursor), [monthCursor, tick]);

  const cogsPercent = loadLedgerSettings().cogsPercent;
  const cogsYen = Math.round(summary.grandTotal * (cogsPercent / 100));
  const expenseTotal = useMemo(() => {
    const parsed = {};
    for (const { key } of EXPENSE_LINE_DEFS) {
      parsed[key] = Number(String(amounts[key] || '').replace(/,/g, '')) || 0;
    }
    return expenseAmountsTotal(parsed);
  }, [amounts]);

  const profitEstimate = summary.grandTotal - cogsYen - expenseTotal;
  const isLocked = !!confirmed;

  useEffect(() => {
    const rec = getMonthExpense(monthCursor);
    setAmounts(amountsToForm(rec));
    setMemo(rec?.memo || '');
    setSavedMsg('');
  }, [monthCursor, tick]);

  const persist = () => {
    if (isLocked) return;
    const parsed = {};
    for (const { key } of EXPENSE_LINE_DEFS) {
      parsed[key] = Math.max(0, Math.round(Number(String(amounts[key] || '').replace(/,/g, '')) || 0));
    }
    saveMonthExpense(monthCursor, { amounts: parsed, memo });
    setSavedMsg(`${monthLabel(monthCursor)}の経費を保存しました`);
    window.setTimeout(() => setSavedMsg(''), 2400);
  };

  const onAmountChange = (key, value) => {
    if (isLocked) return;
    setAmounts((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="month-expenses-panel master-card" aria-labelledby="month-expenses-title">
      <h2 id="month-expenses-title" className="master-card-title">
        経費入力
      </h2>
      <p className="month-expenses-panel__lead">
        人件費・家賃などを月ごとに金額で入力します。原価（％）は日計の店舗設定のまま月締めに反映されます。
      </p>

      <LedgerDataNotice />

      <div className="month-close-nav">
        <button type="button" className="month-close-nav__btn" onClick={() => setMonthCursor(shiftMonthKey(monthCursor, -1))}>
          ← 前月
        </button>
        <strong className="month-close-nav__label">{monthLabel(monthCursor)}</strong>
        <button type="button" className="month-close-nav__btn" onClick={() => setMonthCursor(shiftMonthKey(monthCursor, 1))}>
          翌月 →
        </button>
      </div>

      {isLocked ? (
        <p className="month-close-badge" role="status">
          この月は月締め確定済みのため、経費は編集できません（確定を取り消すと編集可能）
        </p>
      ) : null}

      <div className="month-expenses-ref">
        <div className="month-expenses-ref__item">
          <span className="month-expenses-ref__lab">月間総売上（日計）</span>
          <strong className="month-expenses-ref__val">{fmtYen(summary.grandTotal)}</strong>
          <span className="month-expenses-ref__sub">{summary.checkoutCount}件</span>
        </div>
        <div className="month-expenses-ref__item">
          <span className="month-expenses-ref__lab">原価（{cogsPercent}%・自動）</span>
          <strong className="month-expenses-ref__val">{fmtYen(cogsYen)}</strong>
          <span className="month-expenses-ref__sub">日計の店舗設定</span>
        </div>
      </div>

      <div className="month-expenses-form">
        <h3 className="month-expenses-form__h">経費（金額入力）</h3>
        <ul className="month-expenses-form__list">
          {EXPENSE_LINE_DEFS.map(({ key, label }) => (
            <li key={key} className="month-expenses-form__row">
              <label className="month-expenses-form__label" htmlFor={`exp-${key}`}>
                {label}
              </label>
              <div className="month-expenses-form__input-wrap">
                <span className="month-expenses-form__yen">￥</span>
                <input
                  id={`exp-${key}`}
                  type="number"
                  min={0}
                  step={1}
                  className="month-expenses-form__input"
                  value={amounts[key]}
                  onChange={(e) => onAmountChange(key, e.target.value)}
                  onBlur={persist}
                  placeholder="0"
                  inputMode="numeric"
                  disabled={isLocked}
                />
              </div>
            </li>
          ))}
        </ul>

        <label className="month-expenses-memo">
          <span>メモ（任意）</span>
          <textarea
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={persist}
            placeholder="例：パート代・光熱費の内訳"
            disabled={isLocked}
          />
        </label>

        {!isLocked ? (
          <div className="month-expenses-form__actions">
            <button type="button" className="master-btn master-btn--primary" onClick={persist}>
              保存する
            </button>
            {savedExpense?.updatedAt ? (
              <span className="month-expenses-form__saved-at">
                最終保存: {new Date(savedExpense.updatedAt).toLocaleString('ja-JP')}
              </span>
            ) : null}
          </div>
        ) : null}
        {savedMsg ? (
          <p className="month-expenses-form__ok" role="status">
            {savedMsg}
          </p>
        ) : null}
      </div>

      <div className="month-expenses-summary">
        <div className="month-expenses-summary__row">
          <span>経費合計</span>
          <strong>{fmtYen(expenseTotal)}</strong>
        </div>
        <div className="month-expenses-summary__row month-expenses-summary__row--profit">
          <span>粗利の目安（売上 − 原価 − 経費）</span>
          <strong>{fmtYen(profitEstimate)}</strong>
        </div>
        <p className="month-expenses-summary__hint">
          月締めタブでも同じ数値が確認できます。確定前に「経費入力」と「月締め」の両方をご確認ください。
        </p>
      </div>
    </section>
  );
}
