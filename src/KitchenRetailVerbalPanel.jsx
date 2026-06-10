import React, { useCallback, useState } from 'react';
import { KITCHEN_RETAIL_VERBAL_PICKS } from './data/kitchenRetailTakeoutMenu.js';

/**
 * カフェ・テイクアウト会計用の口頭注文
 * @param {{
 *   addToCart: (item: { id: string, name: string, price: number }) => void,
 *   variant?: 'tab' | 'inline',
 * }} props
 */
export default function KitchenRetailVerbalPanel({ addToCart, variant = 'inline' }) {
  const isTab = variant === 'tab';
  const [open, setOpen] = useState(isTab);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [msg, setMsg] = useState(null);

  const addCustom = useCallback(() => {
    const n = name.trim();
    if (!n) {
      setMsg('品名を入力してください');
      return;
    }
    const p = Math.max(0, Math.floor(Number(price) || 0));
    if (p <= 0) {
      setMsg('価格を入力してください');
      return;
    }
    addToCart({
      id: `retail-verbal-${Date.now()}`,
      name: n,
      price: p,
    });
    setName('');
    setPrice('');
    setMsg(null);
  }, [addToCart, name, price]);

  const addPick = useCallback(
    (pick) => {
      addToCart({
        id: pick.itemId,
        name: pick.itemName,
        price: pick.price,
      });
      setMsg(null);
    },
    [addToCart],
  );

  const body = (
    <div className={isTab ? 'kretail-verbal-tab__body' : 'kretail-verbal__body'}>
      <div className={isTab ? 'kretail-verbal-tab__custom' : 'kretail-verbal__custom'}>
        <label className="kretail-verbal__field">
          <span>品名</span>
          <input
            type="text"
            className="kretail-verbal__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：特別セット"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom();
            }}
          />
        </label>
        <label className="kretail-verbal__field kretail-verbal__field--price">
          <span>価格</span>
          <input
            type="number"
            inputMode="numeric"
            className="kretail-verbal__input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            min={0}
            step={10}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom();
            }}
          />
        </label>
        <button type="button" className="kretail-verbal__add-btn" onClick={addCustom}>
          カートに追加
        </button>
      </div>

      <p className={isTab ? 'kretail-verbal-tab__picks-label' : 'kretail-verbal__picks-label'}>よく使う品目</p>
      <div className={isTab ? 'kretail-verbal-tab__picks' : 'kretail-verbal__picks'}>
        {KITCHEN_RETAIL_VERBAL_PICKS.map((p) => (
          <button key={p.itemId} type="button" className="kretail-verbal__pick" onClick={() => addPick(p)}>
            <span className="kretail-verbal__pick-name">{p.itemName}</span>
            <span className="kretail-verbal__pick-price">￥{p.price.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {msg ? (
        <p className="kretail-verbal__msg" role="alert">
          {msg}
        </p>
      ) : null}
    </div>
  );

  if (isTab) {
    return (
      <div className="kitchen-staff-retail-menu kitchen-staff-retail-menu--verbal kretail-verbal-tab">
        <div className="kretail-verbal-tab__head">
          <h2 className="kretail-verbal-tab__title">口頭注文</h2>
          <p className="kretail-verbal-tab__lead">メニューにない品や特別料金を、品名・価格でカートへ追加</p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <section className="kretail-verbal" aria-label="口頭注文">
      <button
        type="button"
        className={`kretail-verbal__toggle${open ? ' kretail-verbal__toggle--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="kretail-verbal__toggle-label">口頭注文</span>
        <span className="kretail-verbal__toggle-hint">{open ? '閉じる' : '品名・価格を手入力'}</span>
      </button>
      {open ? body : null}
    </section>
  );
}
