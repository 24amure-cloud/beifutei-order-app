import React, { useState } from 'react';
import {
  formatLedgerTableMemoLine,
  getLocalDateKey,
  updateDailyLedgerEntryRecordedAt,
} from './dailyLedger.js';
import { datetimeLocalToRecordedAt, ledgerRecordedAtToDatetimeLocal } from './ledgerDateTimeInput.js';
import { verifyOwnerLedgerDeletePin } from './ownerLedgerDeletePin.js';

/**
 * 会計済み伝票の日時を PIN 確認後に修正
 * @param {{
 *   entry: import('./dailyLedger.js').LedgerEntry,
 *   onUpdated?: () => void,
 *   className?: string,
 *   variant?: 'kitchen' | 'master',
 * }} props
 */
export default function LedgerEntryEditDateButton({ entry, onUpdated, className = '', variant = 'kitchen' }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [when, setWhen] = useState(() => ledgerRecordedAtToDatetimeLocal(entry.recordedAt));
  const [err, setErr] = useState('');

  const baseClass =
    variant === 'master' ? 'master-ledger-entry-edit' : 'kitchen-checkout-log__edit-date';

  const label = formatLedgerTableMemoLine(entry.tableLabel, entry.checkoutMemo);

  const close = () => {
    setOpen(false);
    setPin('');
    setWhen(ledgerRecordedAtToDatetimeLocal(entry.recordedAt));
    setErr('');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!verifyOwnerLedgerDeletePin(pin)) {
      setErr('パスワードが違います');
      return;
    }
    const nextMs = datetimeLocalToRecordedAt(when);
    if (nextMs == null) {
      setErr('日時を選んでください');
      return;
    }
    const oldKey = entry.dateKey;
    const newKey = getLocalDateKey(nextMs);
    const oldFmt = new Date(entry.recordedAt).toLocaleString('ja-JP');
    const newFmt = new Date(nextMs).toLocaleString('ja-JP');
    if (
      !window.confirm(
        `${label} の会計日時を変更しますか？\n${oldFmt} → ${newFmt}\n` +
          (oldKey !== newKey ? `（集計日が ${oldKey} → ${newKey} に移ります）` : ''),
      )
    ) {
      return;
    }
    const updated = updateDailyLedgerEntryRecordedAt(entry.id, nextMs);
    if (!updated) {
      window.alert('更新できませんでした');
      return;
    }
    close();
    onUpdated?.();
  };

  return (
    <>
      <button
        type="button"
        className={`${baseClass}${className ? ` ${className}` : ''}`}
        onClick={() => {
          setWhen(ledgerRecordedAtToDatetimeLocal(entry.recordedAt));
          setOpen(true);
        }}
        aria-label={`${label}の会計日時を修正`}
      >
        日時
      </button>
      {open ? (
        <div
          className="ledger-owner-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ledger-edit-date-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) close();
          }}
        >
          <form className="ledger-owner-dialog__panel" onSubmit={onSubmit}>
            <h3 id="ledger-edit-date-title" className="ledger-owner-dialog__title">
              伝票の日時を修正
            </h3>
            <p className="ledger-owner-dialog__lead">
              {label} の会計日時を変更します。オーナー用パスワード（1211）を入力してください。
            </p>
            <label className="ledger-owner-dialog__field">
              <span className="ledger-owner-dialog__lab">新しい日時</span>
              <input
                type="datetime-local"
                className="ledger-owner-dialog__input ledger-owner-dialog__input--datetime"
                value={when}
                onChange={(ev) => {
                  setWhen(ev.target.value);
                  setErr('');
                }}
              />
            </label>
            <label className="ledger-owner-dialog__field">
              <span className="ledger-owner-dialog__lab">パスワード</span>
              <input
                type="password"
                className="ledger-owner-dialog__input"
                value={pin}
                onChange={(ev) => {
                  setPin(ev.target.value);
                  setErr('');
                }}
                autoComplete="off"
                inputMode="numeric"
              />
            </label>
            {err ? (
              <p className="ledger-owner-dialog__err" role="alert">
                {err}
              </p>
            ) : null}
            <div className="ledger-owner-dialog__actions">
              <button type="button" className="ledger-owner-dialog__cancel" onClick={close}>
                キャンセル
              </button>
              <button type="submit" className="ledger-owner-dialog__submit ledger-owner-dialog__submit--primary">
                保存
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
