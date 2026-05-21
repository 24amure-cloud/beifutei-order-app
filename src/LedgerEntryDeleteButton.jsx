import React, { useState } from 'react';
import { formatLedgerTableMemoLine, removeDailyLedgerEntry } from './dailyLedger.js';
import { verifyOwnerLedgerDeletePin } from './ownerLedgerDeletePin.js';

/**
 * 会計済み伝票（日計1件）を PIN 確認後に削除
 * @param {{
 *   entry: import('./dailyLedger.js').LedgerEntry,
 *   onDeleted?: () => void,
 *   className?: string,
 *   variant?: 'kitchen' | 'master',
 * }} props
 */
export default function LedgerEntryDeleteButton({ entry, onDeleted, className = '', variant = 'kitchen' }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const baseClass =
    variant === 'master' ? 'master-ledger-entry-delete' : 'kitchen-checkout-log__delete';

  const label = formatLedgerTableMemoLine(entry.tableLabel, entry.checkoutMemo);
  const total = Number(entry.total || 0).toLocaleString();

  const close = () => {
    setOpen(false);
    setPin('');
    setErr('');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!verifyOwnerLedgerDeletePin(pin)) {
      setErr('パスワードが違います');
      return;
    }
    if (!window.confirm(`${label} の会計記録（￥${total}・税込）を削除しますか？\n日計・売上からも消えます。`)) {
      return;
    }
    const ok = removeDailyLedgerEntry(entry.id);
    if (!ok) {
      window.alert('削除できませんでした（既に消えている可能性があります）');
      return;
    }
    close();
    onDeleted?.();
  };

  return (
    <>
      <button
        type="button"
        className={`${baseClass}${className ? ` ${className}` : ''}`}
        onClick={() => setOpen(true)}
        aria-label={`${label}の会計記録を削除`}
      >
        削除
      </button>
      {open ? (
        <div
          className="ledger-owner-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ledger-delete-dialog-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) close();
          }}
        >
          <form className="ledger-owner-dialog__panel" onSubmit={onSubmit}>
            <h3 id="ledger-delete-dialog-title" className="ledger-owner-dialog__title">
              伝票を削除
            </h3>
            <p className="ledger-owner-dialog__lead">
              {label}（￥{total}）を日計から削除します。オーナー用パスワードを入力してください。
            </p>
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
                autoFocus
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
              <button type="submit" className="ledger-owner-dialog__submit">
                削除する
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
