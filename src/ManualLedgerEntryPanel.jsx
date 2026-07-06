import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appendDailyLedgerEntry, getLocalDateKey } from './dailyLedger.js';
import ManualLedgerMenuPicker from './ManualLedgerMenuPicker.jsx';
import {
  loadManualLedgerLastRecordedAtLocal,
  loadManualLedgerLinePresets,
  rememberManualLedgerLastRecordedAtLocal,
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

function initialRecordedAtLocal(dateKey) {
  return loadManualLedgerLastRecordedAtLocal() ?? defaultDatetimeForDateKey(dateKey);
}

function newLineRow() {
  return { id: `ml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', price: '', qty: 1 };
}

function parseLineUnitPrice(row) {
  const p = Number(String(row?.price ?? '').replace(/,/g, ''));
  return Number.isFinite(p) && p > 0 ? p : 0;
}

function parseLineQty(row) {
  const q = Number(String(row?.qty ?? 1).replace(/,/g, ''));
  return Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1;
}

function lineRowTotal(row) {
  return parseLineUnitPrice(row) * parseLineQty(row);
}

function findMatchingLineIndex(lines, name, unitPrice) {
  const n = String(name || '').trim();
  if (!n || unitPrice <= 0) return -1;
  return lines.findIndex(
    (row) => String(row.name || '').trim() === n && parseLineUnitPrice(row) === unitPrice,
  );
}

const PAYMENT_OPTIONS = [
  { id: 'cash', label: '現金' },
  { id: 'card', label: 'カード' },
  { id: 'card_5pct', label: 'カード・5%' },
];

/**
 * 伝票後入力（オーナー画面・専用タブ）
 * @param {{ dateKey?: string, onSaved?: () => void }} props
 */
export default function ManualLedgerEntryPanel({ dateKey: dateKeyProp, onSaved }) {
  const [ledgerDateKey] = useState(() => dateKeyProp || getLocalDateKey());
  const [recordedAtLocal, setRecordedAtLocal] = useState(() => initialRecordedAtLocal(ledgerDateKey));
  const [tableLabel, setTableLabel] = useState('');
  const [payment, setPayment] = useState('cash');
  const [totalYen, setTotalYen] = useState('');
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState(() => [newLineRow()]);
  const [activeLineId, setActiveLineId] = useState(() => lines[0]?.id ?? '');
  const [linePresets, setLinePresets] = useState(() => loadManualLedgerLinePresets());
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const totalManualRef = useRef(false);

  useEffect(() => {
    if (loadManualLedgerLastRecordedAtLocal()) return;
    setRecordedAtLocal(defaultDatetimeForDateKey(ledgerDateKey));
  }, [ledgerDateKey]);

  const lineSubtotal = useMemo(() => {
    return lines.reduce((sum, row) => sum + lineRowTotal(row), 0);
  }, [lines]);

  useEffect(() => {
    if (totalManualRef.current) return;
    if (lineSubtotal > 0) {
      setTotalYen(String(lineSubtotal));
    }
  }, [lineSubtotal]);

  const parsedTotalYen = useMemo(() => {
    const n = Number(String(totalYen).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [totalYen]);

  const resetForm = () => {
    const first = newLineRow();
    setTableLabel('');
    setPayment('cash');
    setTotalYen('');
    totalManualRef.current = false;
    setMemo('');
    setLines([first]);
    setActiveLineId(first.id);
    setErr('');
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
      if (prev.length <= 1) {
        const empty = newLineRow();
        setActiveLineId(empty.id);
        return [empty];
      }
      const next = prev.filter((row) => row.id !== id);
      if (activeLineId === id) setActiveLineId(next[0]?.id ?? '');
      return next;
    });
  };

  const syncTotalFromLines = () => {
    totalManualRef.current = false;
    if (lineSubtotal > 0) {
      setTotalYen(String(lineSubtotal));
    }
  };

  const onTotalYenChange = (value) => {
    totalManualRef.current = true;
    setTotalYen(value);
  };

  const adjustLineQty = (id, delta) => {
    setLines((prev) => {
      const idx = prev.findIndex((row) => row.id === id);
      if (idx < 0) return prev;
      const row = prev[idx];
      const curQty = parseLineQty(row);
      const nextQty = curQty + delta;
      if (nextQty >= 1) {
        return prev.map((r) => (r.id === id ? { ...r, qty: nextQty } : r));
      }
      if (prev.length <= 1) {
        const empty = newLineRow();
        setActiveLineId(empty.id);
        return [empty];
      }
      const next = prev.filter((r) => r.id !== id);
      if (activeLineId === id) setActiveLineId(next[0]?.id ?? '');
      return next;
    });
  };

  const normalizeLineQty = (id) => {
    setLines((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const raw = String(row.qty ?? '').trim();
        if (!raw) return { ...row, qty: 1 };
        const q = Math.floor(Number(raw.replace(/,/g, '')));
        if (!Number.isFinite(q) || q < 1) return { ...row, qty: 1 };
        return { ...row, qty: q };
      }),
    );
  };

  const applyPreset = useCallback(
    (preset, { increment = false, addQty = 1 } = {}) => {
      const unitPrice =
        preset.price != null && Number(preset.price) > 0 ? Math.round(Number(preset.price)) : 0;
      const priceStr = unitPrice > 0 ? String(unitPrice) : '';
      const qtyDelta = Math.max(1, Math.floor(Number(addQty) || 1));

      setLines((prev) => {
        if (increment && unitPrice > 0) {
          const matchIdx = findMatchingLineIndex(prev, preset.name, unitPrice);
          if (matchIdx >= 0) {
            setActiveLineId(prev[matchIdx].id);
            return prev.map((row, i) =>
              i === matchIdx ? { ...row, qty: parseLineQty(row) + qtyDelta } : row,
            );
          }
        }

        let idx = prev.findIndex((row) => row.id === activeLineId);
        if (idx < 0) idx = prev.findIndex((row) => !String(row.name || '').trim());
        const target = idx >= 0 ? prev[idx] : null;
        if (target && !String(target.name || '').trim() && !String(target.price || '').trim()) {
          return prev.map((row, i) =>
            i === idx ? { ...row, name: preset.name, price: priceStr, qty: 1 } : row,
          );
        }
        const row = { ...newLineRow(), name: preset.name, price: priceStr, qty: 1 };
        setActiveLineId(row.id);
        return [...prev, row];
      });
    },
    [activeLineId],
  );

  const applyMenuPick = useCallback(
    ({ name, price, delta = 1 }) => {
      const priceNum = Number(price);
      const hasPrice = price !== '' && price != null && Number.isFinite(priceNum) && priceNum > 0;
      const preset = { name: String(name || '').trim(), price: hasPrice ? priceNum : 0 };
      if (!preset.name) return;

      const step = delta >= 0 ? 1 : -1;
      const times = Math.max(1, Math.abs(Math.floor(delta)));

      if (step < 0 && hasPrice) {
        setLines((prev) => {
          const matchIdx = findMatchingLineIndex(prev, preset.name, priceNum);
          if (matchIdx < 0) return prev;
          const row = prev[matchIdx];
          const curQty = parseLineQty(row);
          if (curQty <= times) {
            if (prev.length <= 1) {
              const empty = newLineRow();
              setActiveLineId(empty.id);
              return [empty];
            }
            const next = prev.filter((r) => r.id !== row.id);
            setActiveLineId(next[0]?.id ?? '');
            return next;
          }
          return prev.map((r, i) =>
            i === matchIdx ? { ...r, qty: curQty - times } : r,
          );
        });
        return;
      }

      applyPreset(preset, { increment: hasPrice, addQty: times });
    },
    [applyPreset],
  );

  const getPickQty = useCallback(
    (name, price) => {
      const unitPrice = Math.max(0, Math.round(Number(price) || 0));
      const row = lines.find(
        (r) => String(r.name || '').trim() === String(name || '').trim() && parseLineUnitPrice(r) === unitPrice,
      );
      return row ? parseLineQty(row) : 0;
    },
    [lines],
  );

  const onSubmit = (e) => {
    e.preventDefault();
    setErr('');
    setOkMsg('');

    const tl = String(tableLabel || '').trim() || DEFAULT_TABLE_LABEL;

    const recordedAt = parseDatetimeLocal(recordedAtLocal);
    if (recordedAt == null) {
      setErr('会計日時を確認してください');
      return;
    }

    const total = parsedTotalYen > 0 ? parsedTotalYen : lineSubtotal;
    if (!Number.isFinite(total) || total <= 0) {
      setErr('お会計合計（税込）を入力してください');
      return;
    }

    const ledgerLines = lines
      .map((row) => {
        const name = String(row.name || '').trim();
        const unitPrice = parseLineUnitPrice(row);
        const qty = parseLineQty(row);
        if (!name || unitPrice <= 0) return null;
        const lineTotal = unitPrice * qty;
        return {
          kind: 'normal',
          name: qty > 1 ? `${name} ×${qty}` : name,
          price: lineTotal,
        };
      })
      .filter(Boolean);

    const lineItemCount = lines.reduce((sum, row) => {
      const name = String(row.name || '').trim();
      const unitPrice = parseLineUnitPrice(row);
      if (!name || unitPrice <= 0) return sum;
      return sum + parseLineQty(row);
    }, 0);

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
      normalCount: Math.max(1, lineItemCount || ledgerLines.length),
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

    const presetSource = lines
      .map((row) => ({
        name: String(row.name || '').trim(),
        price: parseLineUnitPrice(row),
      }))
      .filter((row) => row.name && row.price > 0);

    if (presetSource.length > 0) {
      setLinePresets(rememberManualLedgerLinePresets(presetSource));
    }

    rememberManualLedgerLastRecordedAtLocal(recordedAtLocal);

    const tableNote = String(tableLabel || '').trim() ? `テーブル${tl}・` : '';
    setOkMsg(
      `登録しました（${tableNote}￥${total.toLocaleString()}・${new Date(recordedAt).toLocaleString('ja-JP')}）`,
    );
    resetForm();
    onSaved?.();
  };

  return (
    <section className="master-card master-card--manual-entry-page manual-ledger-entry-page">
      <header className="manual-ledger-entry-page__head">
        <h2 className="master-card-title">伝票後入力</h2>
        <p className="manual-ledger-entry-page__lead">
          営業中に打ち込めなかった手書き控えを日計へ追加します。厨房の会計と同じデータに載ります。
        </p>
      </header>

      <form className="manual-ledger-entry__form manual-ledger-entry__form--page" onSubmit={onSubmit}>
        <p className="manual-ledger-entry__lead">
          会計日時は前回のまま残るので、続けて入力しやすくなっています。
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
          </div>

          <div className="manual-ledger-entry__lines">
            <div className="manual-ledger-entry__lines-head">
              <h4 className="manual-ledger-entry__lines-title">明細</h4>
              <p className="manual-ledger-entry__lines-hint">
                下のメニューからタップで追加。下部の合計は明細から自動で入ります（伝票と違うときは直接修正）。
              </p>
            </div>

            <ManualLedgerMenuPicker
              onPickLine={applyMenuPick}
              ledgerPresets={linePresets}
              getPickQty={getPickQty}
            />

            <p className="manual-ledger-entry__lines-edit-label">明細の確認・修正</p>
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
                    placeholder="単価"
                    inputMode="numeric"
                    aria-label="単価"
                  />
                  <div className="manual-ledger-entry__line-qty" aria-label="数量">
                    <button
                      type="button"
                      className="manual-ledger-entry__line-qty-btn"
                      onClick={() => adjustLineQty(row.id, -1)}
                      aria-label={parseLineQty(row) <= 1 ? 'この行を削除' : '数量を減らす'}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="manual-ledger-entry__input manual-ledger-entry__input--qty"
                      value={row.qty ?? ''}
                      onChange={(ev) => updateLine(row.id, 'qty', ev.target.value)}
                      onBlur={() => normalizeLineQty(row.id)}
                      onFocus={() => setActiveLineId(row.id)}
                      inputMode="numeric"
                      aria-label="個数"
                    />
                    <span className="manual-ledger-entry__line-qty-unit">個</span>
                    <button
                      type="button"
                      className="manual-ledger-entry__line-qty-btn manual-ledger-entry__line-qty-btn--plus"
                      onClick={() => adjustLineQty(row.id, 1)}
                      aria-label="数量を増やす"
                    >
                      ＋
                    </button>
                  </div>
                  {parseLineUnitPrice(row) > 0 && parseLineQty(row) > 1 ? (
                    <span className="manual-ledger-entry__line-subtotal">
                      小計 ￥{lineRowTotal(row).toLocaleString()}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="manual-ledger-entry__line-remove"
                    onClick={() => removeLine(row.id)}
                    aria-label="この行を削除"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="master-btn master-btn--secondary master-btn--small" onClick={addLine}>
              明細行を追加
            </button>

            <div className="manual-ledger-entry__lines-total" aria-live="polite">
              {lineSubtotal > 0 ? (
                <div className="manual-ledger-entry__lines-total-row">
                  <span className="manual-ledger-entry__lines-total-lab">明細計</span>
                  <strong className="manual-ledger-entry__lines-total-val">
                    ￥{lineSubtotal.toLocaleString()}
                  </strong>
                </div>
              ) : null}
              <label className="manual-ledger-entry__lines-total-row manual-ledger-entry__lines-total-row--grand manual-ledger-entry__lines-total-field">
                <span className="manual-ledger-entry__lines-total-lab">お会計合計（税込）</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="manual-ledger-entry__input manual-ledger-entry__input--total-bottom"
                  value={totalYen}
                  onChange={(ev) => onTotalYenChange(ev.target.value)}
                  placeholder={lineSubtotal > 0 ? String(lineSubtotal) : '伝票の合計'}
                  inputMode="numeric"
                  required
                  aria-label="お会計合計（税込）"
                />
              </label>
              {parsedTotalYen > 0 && lineSubtotal > 0 && parsedTotalYen !== lineSubtotal ? (
                <p className="manual-ledger-entry__lines-total-note">
                  明細計と異なります（この金額で登録）
                  <button
                    type="button"
                    className="manual-ledger-entry__lines-total-sync"
                    onClick={syncTotalFromLines}
                  >
                    明細計に合わせる
                  </button>
                </p>
              ) : null}
            </div>
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
    </section>
  );
}
