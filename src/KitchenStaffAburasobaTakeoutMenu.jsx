import React, { useMemo, useState } from 'react';
import {
  KITCHEN_ABURASOBA_TAKEOUT,
  KITCHEN_ABURASOBA_TOPPINGS,
  KITCHEN_TAKEOUT_CONTAINER_ITEMS,
} from './data/kitchenRetailTakeoutMenu.js';

const SIZE_KEYS = ['小', '並', '大'];

/**
 * 油そばお持ち帰り：種類→サイズ→共通トッピング→追加の1画面UI
 * @param {{ addToCart: (item: { id: string, name: string, price: number }) => void }} props
 */
export default function KitchenStaffAburasobaTakeoutMenu({ addToCart }) {
  const [bowlKey, setBowlKey] = useState('normal');
  const [size, setSize] = useState('並');
  const [toppingIds, setToppingIds] = useState([]);

  const bowl = KITCHEN_ABURASOBA_TAKEOUT.find((b) => b.key === bowlKey) ?? KITCHEN_ABURASOBA_TAKEOUT[0];
  const sizePrice = bowl.prices[size] ?? bowl.prices['並'];
  const tops = useMemo(
    () => KITCHEN_ABURASOBA_TOPPINGS.filter((t) => toppingIds.includes(t.id)),
    [toppingIds],
  );
  const topsPrice = tops.reduce((s, t) => s + t.price, 0);
  const totalPrice = sizePrice + topsPrice;

  const toggleTop = (id) => {
    setToppingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addBowl = () => {
    const topLabel = tops.length ? `＋${tops.map((t) => t.name).join('・')}` : '';
    addToCart({
      id: `to-abu-${bowl.key}-${size}${tops.length ? `-${tops.map((t) => t.id).join('-')}` : ''}`,
      name: `${bowl.name}（${size}${topLabel ? ` ${topLabel}` : ''}）`,
      price: totalPrice,
    });
    setToppingIds([]);
  };

  const addSoloTop = (top) => {
    addToCart({
      id: `${top.id}-solo-${Date.now()}`,
      name: top.name,
      price: top.price,
    });
  };

  return (
    <div className="kitchen-staff-retail-menu kitchen-staff-retail-menu--aburasoba kretail-abu-board">
      <div className="kretail-abu-board__head">
        <h2 className="kretail-abu-board__title">油そば お持ち帰り</h2>
        <p className="kretail-abu-board__lead">種類 → サイズ → トッピング → 追加</p>
      </div>

      <section className="kretail-abu-board__section" aria-label="種類">
        <span className="kretail-abu-board__label">種類</span>
        <div className="kretail-abu-board__bowls" role="group">
          {KITCHEN_ABURASOBA_TAKEOUT.map((b) => (
            <button
              key={b.key}
              type="button"
              className={`kretail-abu-board__bowl${bowlKey === b.key ? ' is-active' : ''}`}
              onClick={() => setBowlKey(b.key)}
              aria-pressed={bowlKey === b.key}
            >
              <span className="kretail-abu-board__bowl-name">{b.name.replace(' 油そば', '')}</span>
              <span className="kretail-abu-board__bowl-sub">油そば</span>
            </button>
          ))}
        </div>
      </section>

      <section className="kretail-abu-board__section kretail-abu-board__section--row" aria-label="サイズ">
        <span className="kretail-abu-board__label">サイズ</span>
        <div className="kretail-abu-board__sizes" role="group">
          {SIZE_KEYS.map((s) => (
            <button
              key={s}
              type="button"
              className={`kretail-abu-board__size${size === s ? ' is-active' : ''}`}
              onClick={() => setSize(s)}
              aria-pressed={size === s}
            >
              {s}
              <small>￥{(bowl.prices[s] ?? 0).toLocaleString()}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="kretail-abu-board__section kretail-abu-board__section--tops" aria-label="トッピング">
        <div className="kretail-abu-board__tops-head">
          <span className="kretail-abu-board__label">トッピング</span>
          {toppingIds.length > 0 ? (
            <button type="button" className="kretail-abu-board__tops-clear" onClick={() => setToppingIds([])}>
              選択解除
            </button>
          ) : null}
        </div>
        <div className="kretail-abu-board__tops">
          {KITCHEN_ABURASOBA_TOPPINGS.map((top) => (
            <button
              key={top.id}
              type="button"
              className={`kretail-abu-board__top${toppingIds.includes(top.id) ? ' is-active' : ''}`}
              onClick={() => toggleTop(top.id)}
              aria-pressed={toppingIds.includes(top.id)}
            >
              <span className="kretail-abu-board__top-name">{top.name}</span>
              <span className="kretail-abu-board__top-price">+￥{top.price}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="kretail-abu-board__commit">
        <div className="kretail-abu-board__preview">
          <span className="kretail-abu-board__preview-name">
            {bowl.name}（{size}）
            {tops.length ? ` ＋${tops.length}種` : ''}
          </span>
          <strong className="kretail-abu-board__preview-price">￥{totalPrice.toLocaleString()}</strong>
        </div>
        <button type="button" className="kretail-abu-board__add" onClick={addBowl}>
          カートに追加
        </button>
      </div>

      <footer className="kretail-abu-board__extras">
        <div className="kretail-abu-board__extra-group">
          <span className="kretail-abu-board__label">容器</span>
          <div className="kretail-abu-board__chips">
            {KITCHEN_TAKEOUT_CONTAINER_ITEMS.map((it) => (
              <button
                key={it.id}
                type="button"
                className="kretail-abu-board__chip kretail-abu-board__chip--container"
                onClick={() => addToCart({ id: it.id, name: it.name, price: it.price })}
              >
                {it.name.replace('お持ち帰り', '')}
                <strong>￥{it.price}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="kretail-abu-board__extra-group">
          <span className="kretail-abu-board__label">トッピング単品</span>
          <div className="kretail-abu-board__chips kretail-abu-board__chips--scroll">
            {KITCHEN_ABURASOBA_TOPPINGS.map((top) => (
              <button
                key={`solo-${top.id}`}
                type="button"
                className="kretail-abu-board__chip"
                onClick={() => addSoloTop(top)}
              >
                {top.name}
                <strong>￥{top.price}</strong>
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
