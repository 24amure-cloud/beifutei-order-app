import React, { useEffect, useMemo, useState } from 'react';
import { appendDailyLedgerEntry, getLocalDateKey } from './dailyLedger.js';
import { verifyOwnerLedgerDeletePin } from './ownerLedgerDeletePin.js';
import {
  loadManualLedgerLinePresets,
  rememberManualLedgerLinePresets,
} from './manualLedgerLinePresets.js';
import './manualLedgerEntry.css';

const DEFAULT_TABLE_LABEL = '控え';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDatetimeLocalValue(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function defaultDatetimeForDateKey(dateKey) {
  const now = new Date();
  if (dateKey === getLocalDateKey(now)) {
    return toDatetimeLocalValue(now);
  }
  return `${dateKey}T20:00`;
}

function parseDatetimeLocal(value) {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : null;
}

function newLineRow() {
  return { id: `ml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', price: '' };
}

const PAYMENT_OPTIONS = [
  { id: 'cash', label: '現金' },
  { id: 'card', label: 'カード' },
  { id: 'card_5pct', label: 'カード・5%' },
];

/**
 * 手書き伝票控えの後入力（オーナー画面・日計）
 * @param {{ dateKey: string, onSaved?: () => void }} props
 */
export default function ManualLedgerEntryPanel({ dateKey, onSaved }) {
  const [open, setOpen] = useState(false);
  const [recordedAtLocal, setRecordedAtLocal] = useState(() => defaultDatetimeForDateKey(dateKey));
  const [tableLabel, setTableLabel] = useState('');
  const [payment, setPayment] = useState('cash');
  const [totalYen, setTotalYen] = useState('');
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState(() => [newLineRow()]);
  const [activeLineId, setActiveLineId] = useState(() => lines[0]?.id ?? '');
  const [linePresets, setLinePresets] = useState(() => loadManualLedgerLinePresets());
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    setRecordedAtLocal(defaultDatetimeForDateKey(dateKey));
  }, [dateKey]);

  const lineSubtotal = useMemo(() => {
    return lines.reduce((sum, row) => {
      const p = Number(String(row.price).replace(/,/g, ''));
      return sum + (Number.isFinite(p) && p > 0 ? p : 0);
    }, 0);
  }, [lines]);

  const resetForm = () => {
    const first = newLineRow();
    setTableLabel('');
    setPayment('cash');
    setTotalYen('');
    setMemo('');
    setLines([first]);
    setActiveLineId(first.id);
    setPin('');
    setErr('');
    setRecordedAtLocal(defaultDatetimeForDateKey(dateKey));
  };

  const addLine = () => {
    const row = newLineRow();
    setLines((prev) => [...prev, row]);
    setActiveLineId(row.id);
  };

  const updateLine = (id, field, value) => {
    setLines((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeLine = (id) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((row) => row.id !== id);
      if (activeLineId === id) setActiveLineId(next[0]?.id ?? '');
      return next;
    });
  };

  const applyPreset = (preset) => {
    setLines((prev) => {
      let idx = prev.findIndex((row) => row.id === activeLineId);
      if (idx < 0) idx = prev.findIndex((row) => !String(row.name || '').trim());
      const target = idx >= 0 ? prev[idx] : null;
      if (target && !String(target.name || '').trim() && !String(target.price || '').trim()) {
        return prev.map((row, i) =>
          i === idx
            ? { ...row, name: preset.name, price: String(preset.price) }
            : row,
        );
      }
      const row = { ...newLineRow(), name: preset.name, price: String(preset.price) };
      setActiveLineId(row.id);
      return [...prev, row];
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setErr('');
    setOkMsg('');

    if (!verifyOwnerLedgerDeletePin(pin)) {
      setErr('オーナー用パスワードが違います');
      return;
    }

    const tl = String(tableLabel || '').trim() || DEFAULT_TABLE_LABEL;

    const recordedAt = parseDatetimeLocal(recordedAtLocal);
    if (recordedAt == null) {
      setErr('会計日時を確認してください');
      return;
    }

    const total = Number(String(totalYen).replace(/,/g, ''));
    if (!Number.isFinite(total) || total <= 0) {
      setErr('お会計合計（税込）を入力してください');
      return;
    }

    const ledgerLines = lines
      .map((row) => {
        const name = String(row.name || '').trim();
        const price = Number(String(row.price).replace(/,/g, ''));
        if (!name || !Number.isFinite(price) || price <= 0) return null;
        return { kind: 'normal', name, price };
      })
      .filter(Boolean);

    const normalSubtotal = ledgerLines.length > 0 ? lineSubtotal : total;
    const userMemo = String(memo || '').replace(/\s+/g, ' ').trim();
    const checkoutMemo = userMemo
      ? userMemo.startsWith('手書き')
        ? userMemo
        : `手書き控え・${userMemo}`
      : '手書き伝票控え（後入力）';

    appendDailyLedgerEntry({
      recordedAt,
      tableKey: `manual::${tl}`,
      tableLabel: tl,
      payment,
      total,
      normalSubtotal,
      nomihodaiPlanYen: 0,
      normalCount: Math.max(1, ledgerLines.length),
      nomihodaiCount: 0,
      lines:
        ledgerLines.length > 0
          ? ledgerLines
          : [{ kind: 'normal', name: '手書き伝票（明細なし）', price: total }],
      hadNomihodaiCheckout: false,
      people: 1,
      checkoutMemo,
      orderSource: 'manual',
    });

    if (ledgerLines.length > 0) {
      setLinePresets(rememberManualLedgerLinePresets(ledgerLines));
    }

    const tableNote = String(tableLabel || '').trim() ? `テーブル${tl}・` : '';
    setOkMsg(
      `登録しました（${tableNote}￥${total.toLocaleString()}・${new Date(recordedAt).toLocaleString('ja-JP')}）`,
    );
    resetForm();
    onSaved?.();
  };

  return (
    <div className="master-ledger-block master-ledger-block--manual-entry">
      <details className="manual-ledger-entry" open={open} onToggle={(ev) => setOpen(ev.target.open)}>
        <summary className="manual-ledger-entry__summary">
          <span className="manual-ledger-entry__summary-title">手書き伝票の後入力</span>
          <span className="manual-ledger-entry__summary-hint">
            営業中に打ち込めなかった控えを日計へ追加
          </span>
        </summary>

        <form className="manual-ledger-entry__form" onSubmit={onSubmit}>
          <p className="manual-ledger-entry__lead">
            紙の伝票控えを見ながら入力してください。厨房での会計操作と同じく日計・売上カレンダーに反映されます。
            会計が実際にあった日時を選んでください（昨日分なども可）。
          </p>

          <div className="manual-ledger-entry__grid">
            <label className="manual-ledger-entry__field">
              <span className="manual-ledger-entry__lab">会計日時</span>
              <input
                type="datetime-local"
                className="manual-ledger-entry__input manual-ledger-entry__input--datetime"
                value={recordedAtLocal}
                onChange={(ev) => setRecordedAtLocal(ev.target.value)}
                required
              />
            </label>

            <label className="manual-ledger-entry__field">
              <span className="manual-ledger-entry__lab">卓番（任意）</span>
              <input
                type="text"
                className="manual-ledger-entry__input"
                value={tableLabel}
                onChange={(ev) => setTableLabel(ev.target.value)}
                placeholder="空欄でOK"
                inputMode="numeric"
                autoComplete="off"
              />
            </label>

            <label className="manual-ledger-entry__field">
              <span className="manual-ledger-entry__lab">支払い</span>
              <select
                className="manual-ledger-entry__input"
                value={payment}
                onChange={(ev) => setPayment(ev.target.value)}
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="manual-ledger-entry__field manual-ledger-entry__field--total">
              <span className="manual-ledger-entry__lab">お会計合計（税込）</span>
              <input
                type="number"
                min={1}
                step={1}
                className="manual-ledger-entry__input manual-ledger-entry__input--total"
                value={totalYen}
                onChange={(ev) => setTotalYen(ev.target.value)}
                placeholder="伝票の合計"
                inputMode="numeric"
                required
              />
            </label>
          </div>

          <div className="manual-ledger-entry__lines">
            <div className="manual-ledger-entry__lines-head">
              <h4 className="manual-ledger-entry__lines-title">明細（任意）</h4>
              <p className="manual-ledger-entry__lines-hint">
                控えに品名があれば入力。合計だけでも登録できます。
                {lineSubtotal > 0 ? (
                  <span className="manual-ledger-entry__lines-sub">
                    明細計: ￥{lineSubtotal.toLocaleString()}
                  </span>
                ) : null}
              </p>
            </div>

            {linePresets.length > 0 ? (
              <div className="manual-ledger-entry__presets">
                <p className="manual-ledger-entry__presets-label">直近の明細（スライドしてタップ）</p>
                <div className="manual-ledger-entry__presets-scroll" role="list">
                  {linePresets.map((preset) => (
                    <button
                      key={`${preset.name}-${preset.price}`}
                      type="button"
                      className="manual-ledger-entry__preset-chip"
                      role="listitem"
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="manual-ledger-entry__preset-name">{preset.name}</span>
                      <span className="manual-ledger-entry__preset-price">
                        ￥{preset.price.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="manual-ledger-entry__presets-empty">
                明細を登録すると、次回からここに候補が並びます（最大10件）
              </p>
            )}

            <ul className="manual-ledger-entry__line-list">
              {lines.map((row) => (
                <li
                  key={row.id}
                  className={`manual-ledger-entry__line-row${activeLineId === row.id ? ' manual-ledger-entry__line-row--active' : ''}`}
                >
                  <input
                    type="text"
                    className="manual-ledger-entry__input manual-ledger-entry__input--name"
                    value={row.name}
                    onChange={(ev) => updateLine(row.id, 'name', ev.target.value)}
                    onFocus={() => setActiveLineId(row.id)}
                    placeholder="品名（例: 飲み放題2h）"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="manual-ledger-entry__input manual-ledger-entry__input--price"
                    value={row.price}
                    onChange={(ev) => updateLine(row.id, 'price', ev.target.value)}
                    onFocus={() => setActiveLineId(row.id)}
                    placeholder="円"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="manual-ledger-entry__line-remove"
                    onClick={() => removeLine(row.id)}
                    aria-label="この行を削除"
                    disabled={lines.length <= 1}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="master-btn master-btn--secondary master-btn--small" onClick={addLine}>
              明細行を追加
            </button>
          </div>

          <label className="manual-ledger-entry__field manual-ledger-entry__field--memo">
            <span className="manual-ledger-entry__lab">メモ（任意）</span>
            <input
              type="text"
              className="manual-ledger-entry__input"
              value={memo}
              onChange={(ev) => setMemo(ev.target.value)}
              placeholder="例: ラストオーダー分・担当田中"
              maxLength={80}
            />
          </label>

          <label className="manual-ledger-entry__field manual-ledger-entry__field--pin">
            <span className="manual-ledger-entry__lab">オーナー用パスワード</span>
            <input
              type="password"
              className="manual-ledger-entry__input manual-ledger-entry__input--pin"
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
            <p className="manual-ledger-entry__err" role="alert">
              {err}
            </p>
          ) : null}
          {okMsg ? (
            <p className="manual-ledger-entry__ok" role="status">
              {okMsg}
            </p>
          ) : null}

          <div className="manual-ledger-entry__actions">
            <button type="button" className="master-btn master-btn--secondary" onClick={resetForm}>
              入力をクリア
            </button>
            <button type="submit" className="master-btn master-btn--primary">
              日計に登録する
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
