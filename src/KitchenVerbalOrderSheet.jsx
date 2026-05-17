import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMenuMaster } from './MenuMasterContext.jsx';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getNomihodaiForTable } from './nomihodaiSession.js';
import { KITCHEN_VERBAL_FOOD_PICKS, flattenDrinkQuickPicks } from './kitchenVerbalOrderQuickPicks.js';

const TABLE_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function newLineKey() {
  return `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function VerbalStep({ step, title, hint, children, accent }) {
  return (
    <section className={`kitchen-verbal-step${accent ? ` kitchen-verbal-step--${accent}` : ''}`}>
      <header className="kitchen-verbal-step__head">
        <span className="kitchen-verbal-step__n" aria-hidden>
          {step}
        </span>
        <div>
          <h3 className="kitchen-verbal-step__title">{title}</h3>
          {hint ? <p className="kitchen-verbal-step__hint">{hint}</p> : null}
        </div>
      </header>
      <div className="kitchen-verbal-step__body">{children}</div>
    </section>
  );
}

/**
 * @param {{ tableLabel?: string, onClose: () => void, onSubmitted?: (info: { tableLabel: string, count: number, flow: string }) => void }} props
 */
export default function KitchenVerbalOrderSheet({ tableLabel: initialTable, onClose, onSubmitted }) {
  const { session, addStaffOrdersForTable } = useNomihodaiSession();
  const { drinkSections } = useMenuMaster();

  const [tableLabel, setTableLabel] = useState(() => String(initialTable || '1'));
  const [flow, setFlow] = useState('kitchen');
  const [nhPlanDrinks, setNhPlanDrinks] = useState(false);
  const [lines, setLines] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [pickFilter, setPickFilter] = useState('food');
  const [picksOpen, setPicksOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [doneMsg, setDoneMsg] = useState(null);

  const nhActive = !!getNomihodaiForTable(session, tableLabel)?.active;

  useEffect(() => {
    setNhPlanDrinks(nhActive);
  }, [tableLabel, nhActive]);

  useEffect(() => {
    if (initialTable) setTableLabel(String(initialTable));
  }, [initialTable]);

  const drinkPicks = useMemo(() => flattenDrinkQuickPicks(drinkSections, 16), [drinkSections]);

  const addPick = useCallback(
    (pick) => {
      const isDrink = pick.kind === 'drink';
      const nhPlanFree = nhActive && nhPlanDrinks && isDrink;
      setLines((prev) => [
        ...prev,
        {
          _key: newLineKey(),
          itemId: pick.itemId,
          itemName: pick.itemName,
          price: pick.price,
          kind: pick.kind || 'other',
          isNomihodai: nhPlanFree,
          nhPlanFree,
        },
      ]);
      setError(null);
    },
    [nhActive, nhPlanDrinks],
  );

  const addCustomLine = useCallback(() => {
    const name = customName.trim();
    if (!name) {
      setError('品名を入力してください');
      return;
    }
    const price = Math.max(0, Math.floor(Number(customPrice) || 0));
    if (price <= 0 && !(nhActive && nhPlanDrinks)) {
      setError('価格を入力するか、飲み放題ドリンク0円をオンにしてください');
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        _key: newLineKey(),
        itemId: `staff-custom-${Date.now()}`,
        itemName: name,
        price,
        kind: 'other',
        isNomihodai: false,
        nhPlanFree: false,
      },
    ]);
    setCustomName('');
    setCustomPrice('');
    setError(null);
  }, [customName, customPrice, nhActive, nhPlanDrinks]);

  const removeLine = (key) => setLines((prev) => prev.filter((l) => l._key !== key));

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.nhPlanFree ? 0 : Math.max(0, Number(l.price) || 0)), 0),
    [lines],
  );

  const visiblePicks = useMemo(() => {
    if (pickFilter === 'drink') return drinkPicks;
    if (pickFilter === 'food') return KITCHEN_VERBAL_FOOD_PICKS;
    return [...KITCHEN_VERBAL_FOOD_PICKS, ...drinkPicks];
  }, [pickFilter, drinkPicks]);

  const submit = async () => {
    if (!lines.length) {
      setError('品目を1つ以上追加してください');
      return;
    }
    setBusy(true);
    setError(null);
    const status = flow === 'slip' ? 'served' : 'pending';
    const r = await addStaffOrdersForTable(
      tableLabel,
      lines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        itemPrice: l.price,
        isNomihodai: l.isNomihodai,
        kind: l.kind,
        nhPlanFree: l.nhPlanFree,
      })),
      { status, isNomihodai: false },
    );
    setBusy(false);
    if (!r?.ok) {
      setError(r?.errorMessage || '登録に失敗しました');
      return;
    }
    const msg =
      flow === 'slip'
        ? `卓${tableLabel}の伝票に${r.count}品を追加しました`
        : `卓${tableLabel}へ${r.count}品を厨房に送りました`;
    setDoneMsg(msg);
    onSubmitted?.({ tableLabel, count: r.count, flow });
    window.setTimeout(() => onClose(), 700);
  };

  const flowLabel = flow === 'slip' ? '伝票のみ' : '厨房へ送る';

  return (
    <div
      className="kitchen-verbal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kitchen-verbal-title"
      onClick={onClose}
    >
      <div className="kitchen-verbal-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="kitchen-verbal-sheet__head">
          <div className="kitchen-verbal-sheet__head-text">
            <p className="kitchen-verbal-sheet__kicker">口頭で受けた注文</p>
            <h2 id="kitchen-verbal-title" className="kitchen-verbal-sheet__title">
              伝票・厨房へ追加
            </h2>
            <div className="kitchen-verbal-sheet__chips" aria-live="polite">
              <span className="kitchen-verbal-chip kitchen-verbal-chip--table">TABLE {tableLabel}</span>
              <span className={`kitchen-verbal-chip kitchen-verbal-chip--flow kitchen-verbal-chip--flow-${flow}`}>
                {flowLabel}
              </span>
              {lines.length > 0 ? (
                <span className="kitchen-verbal-chip kitchen-verbal-chip--cart">
                  {lines.length}品 · ￥{subtotal.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
          <button type="button" className="kitchen-verbal-sheet__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="kitchen-verbal-sheet__scroll">
          <VerbalStep step="1" title="卓を選ぶ" hint="先に卓番号を選びます">
            <div className="kitchen-verbal-table-grid" role="group" aria-label="卓番号">
              {TABLE_LABELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`kitchen-verbal-table-btn${tableLabel === l ? ' is-active' : ''}`}
                  onClick={() => setTableLabel(l)}
                  aria-pressed={tableLabel === l}
                >
                  <span className="kitchen-verbal-table-btn__num">{l}</span>
                </button>
              ))}
            </div>
          </VerbalStep>

          <VerbalStep step="2" title="登録先" hint="厨房に送るか、伝票だけに載せるかを選びます">
            <div className="kitchen-verbal-flow">
              <button
                type="button"
                className={`kitchen-verbal-flow__btn kitchen-verbal-flow__btn--kitchen${flow === 'kitchen' ? ' is-active' : ''}`}
                onClick={() => setFlow('kitchen')}
                aria-pressed={flow === 'kitchen'}
              >
                <span className="kitchen-verbal-flow__badge">調理</span>
                <span className="kitchen-verbal-flow__title">厨房へ</span>
                <span className="kitchen-verbal-flow__desc">調理待ち → 厨房画面に表示</span>
              </button>
              <button
                type="button"
                className={`kitchen-verbal-flow__btn kitchen-verbal-flow__btn--slip${flow === 'slip' ? ' is-active' : ''}`}
                onClick={() => setFlow('slip')}
                aria-pressed={flow === 'slip'}
              >
                <span className="kitchen-verbal-flow__badge">伝票</span>
                <span className="kitchen-verbal-flow__title">伝票のみ</span>
                <span className="kitchen-verbal-flow__desc">提供済みとして伝票に追加</span>
              </button>
            </div>
          </VerbalStep>

          {nhActive ? (
            <label className="kitchen-verbal-nh">
              <input
                type="checkbox"
                className="kitchen-verbal-nh__check"
                checked={nhPlanDrinks}
                onChange={(e) => setNhPlanDrinks(e.target.checked)}
              />
              <span className="kitchen-verbal-nh__text">
                <strong>飲み放題ドリンクを0円で追加</strong>
                <small>ドリンクのクイック選択時にプラン内として扱います</small>
              </span>
            </label>
          ) : null}

          <VerbalStep step="3" title="品名・価格を手入力" hint="メニューにない品や特別料金のとき" accent="primary">
            <div className="kitchen-verbal-custom">
              <label className="kitchen-verbal-field">
                <span className="kitchen-verbal-field__label">品名</span>
                <input
                  type="text"
                  className="kitchen-verbal-input"
                  placeholder="例：追加トッピング"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomLine();
                  }}
                  autoComplete="off"
                />
              </label>
              <label className="kitchen-verbal-field kitchen-verbal-field--price">
                <span className="kitchen-verbal-field__label">価格</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="kitchen-verbal-input kitchen-verbal-input--price"
                  placeholder="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomLine();
                  }}
                  min={0}
                  step={10}
                />
              </label>
              <button type="button" className="kitchen-verbal-custom__add" onClick={addCustomLine}>
                リストに追加
              </button>
            </div>
          </VerbalStep>

          <VerbalStep step="4" title="よく使う品目" hint="タップでリストに追加" accent="muted">
            <div className="kitchen-verbal-picks-toolbar">
              <div className="kitchen-verbal-pick-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={pickFilter === 'food'}
                  className={`kitchen-verbal-pick-tab${pickFilter === 'food' ? ' is-active' : ''}`}
                  onClick={() => setPickFilter('food')}
                >
                  フード
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={pickFilter === 'drink'}
                  className={`kitchen-verbal-pick-tab${pickFilter === 'drink' ? ' is-active' : ''}`}
                  onClick={() => setPickFilter('drink')}
                >
                  ドリンク
                </button>
              </div>
              <button
                type="button"
                className="kitchen-verbal-picks-toggle"
                onClick={() => setPicksOpen((o) => !o)}
                aria-expanded={picksOpen}
              >
                {picksOpen ? '閉じる' : '開く'}
              </button>
            </div>
            {picksOpen ? (
              <div className="kitchen-verbal-picks__grid">
                {visiblePicks.map((p) => (
                  <button
                    key={p.itemId}
                    type="button"
                    className="kitchen-verbal-pick"
                    onClick={() => addPick(p)}
                  >
                    <span className="kitchen-verbal-pick__name">{p.itemName}</span>
                    <span className="kitchen-verbal-pick__price">
                      {p.kind === 'drink' && nhActive && nhPlanDrinks
                        ? 'NH内'
                        : `￥${p.price.toLocaleString()}`}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </VerbalStep>

          {lines.length > 0 ? (
            <section className="kitchen-verbal-cart" aria-label="追加予定">
              <header className="kitchen-verbal-cart__head">
                <h3 className="kitchen-verbal-cart__title">追加予定</h3>
                <span className="kitchen-verbal-cart__meta">
                  {lines.length}品 · 小計 ￥{subtotal.toLocaleString()}
                </span>
              </header>
              <ul className="kitchen-verbal-cart__list">
                {lines.map((l, i) => (
                  <li key={l._key} className="kitchen-verbal-cart__row">
                    <span className="kitchen-verbal-cart__idx">{i + 1}</span>
                    <div className="kitchen-verbal-cart__main">
                      <span className="kitchen-verbal-cart__name">{l.itemName}</span>
                      {l.nhPlanFree ? <span className="kitchen-verbal-cart__tag">NH内</span> : null}
                    </div>
                    <span className="kitchen-verbal-cart__price">
                      {l.nhPlanFree ? '￥0' : `￥${(l.price || 0).toLocaleString()}`}
                    </span>
                    <button
                      type="button"
                      className="kitchen-verbal-cart__remove"
                      onClick={() => removeLine(l._key)}
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {error ? (
            <p className="kitchen-verbal-msg kitchen-verbal-msg--error" role="alert">
              {error}
            </p>
          ) : null}
          {doneMsg ? (
            <p className="kitchen-verbal-msg kitchen-verbal-msg--ok" role="status">
              {doneMsg}
            </p>
          ) : null}
        </div>

        <footer className="kitchen-verbal-sheet__foot">
          <div className="kitchen-verbal-sheet__foot-summary">
            <span className="kitchen-verbal-sheet__foot-table">卓 {tableLabel}</span>
            <span className="kitchen-verbal-sheet__foot-flow">{flowLabel}</span>
            <span className="kitchen-verbal-sheet__foot-count">
              {lines.length > 0 ? `${lines.length}品 · ￥${subtotal.toLocaleString()}` : '品目未選択'}
            </span>
          </div>
          <div className="kitchen-verbal-sheet__foot-actions">
            <button type="button" className="kitchen-verbal-cancel" onClick={onClose} disabled={busy}>
              キャンセル
            </button>
            <button
              type="button"
              className="kitchen-verbal-submit"
              disabled={busy || lines.length === 0}
              onClick={submit}
            >
              {busy ? '登録中…' : `登録する（${lines.length}品）`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
