/**
 * 厨房スタッフ用：客席 App.jsx のソフトクリーム／カフェドリンク／テイクアウト画面の複製。
 * 客席コードは変更せず、ここだけメンテで客席と揃える運用を想定。
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appendDailyLedgerEntry } from './dailyLedger.js';
import { assertTakeoutSweetsCart, applyTakeoutSweetsSales } from './takeoutSweetsInventory.js';
import TakeoutSweetsMenuView from './TakeoutSweetsMenuView.jsx';
import KitchenRetailVerbalPanel from './KitchenRetailVerbalPanel.jsx';
import KitchenStaffAburasobaTakeoutMenu from './KitchenStaffAburasobaTakeoutMenu.jsx';
import KitchenRetailStatsGate from './KitchenRetailStatsGate.jsx';
import { retailAssetUrl, retailCssBgUrl, STAFF_CAFE_IMAGES } from './retailMenuAssets.js';

const RetailStaffCartContext = createContext(null);

function useRetailStaffCart() {
  const v = useContext(RetailStaffCartContext);
  if (!v) throw new Error('useRetailStaffCart: Provider missing');
  return v;
}

const staffBg = (key) => retailCssBgUrl('staff', STAFF_CAFE_IMAGES[key]);

const PAGE_HEADER_FILES = {
  cafe: ['名称未設定-5_0006_kafedorinnkuhedda-.png', 'kafedorinnkuhedda-.png'],
  fruit: ['名称未設定-5_0002_sofutohedda-.png', 'sofutohedda-.png'],
  takeout: ['名称未設定-5_0000_sui-tuhedda-.png', 'sui-tuhedda-.png'],
};

function PageHeaderImage({ pageKey, alt, lift }) {
  const candidates = PAGE_HEADER_FILES[pageKey];
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [pageKey]);

  if (!candidates?.length) return null;

  const exhausted = attempt >= candidates.length;
  const src = !exhausted ? retailAssetUrl('guest', candidates[attempt]) : '';

  if (exhausted) {
    return (
      <header
        className={`hedda-page-header hedda-page-header--fallback${lift ? ' hedda-page-header--lift' : ''}`}
        role="img"
        aria-label={alt}
      >
        <span className="hedda-page-header__fallback">{alt}</span>
      </header>
    );
  }

  return (
    <header className={`hedda-page-header${lift ? ' hedda-page-header--lift' : ''}`}>
      <img
        key={src}
        src={src}
        alt={alt}
        className="hedda-page-header__img"
        decoding="async"
        onError={() => setAttempt((n) => n + 1)}
      />
    </header>
  );
}

const CAFE_PRICE_BY_SIZE = {
  americano: { M: 420, L: 540 },
  latte: { M: 540, L: 640 },
  strawberry: { M: 580, L: 680 },
  chocolata: { M: 580, L: 680 },
};

function CafePromoMedia({ variant, productStyle, badgeStyle, badgeTone }) {
  const v = variant === 'lg' ? 'lg' : 'sm';
  const areaClass =
    v === 'lg'
      ? 'cafe-img-area cafe-img-area-promo cafe-img-area-promo-lg'
      : 'cafe-img-area cafe-img-area-promo';
  return (
    <div className={areaClass}>
      <div className={`cafe-img-placeholder cafe-img-promo-${v}`} style={productStyle}></div>
      <div className={`cafe-badge ${badgeTone} cafe-badge-promo-${v}`} style={badgeStyle}></div>
    </div>
  );
}

function CafeTempIce({ cafeId, temp, updateOpt }) {
  return (
    <div className="cafe-toggle-group">
      <button type="button" className={`cafe-toggle-btn hot ${temp === 'hot' ? 'active' : ''}`} onClick={() => updateOpt(cafeId, 'temp', 'hot')}>
        HOT
      </button>
      <button type="button" className={`cafe-toggle-btn ice ${temp === 'ice' ? 'active' : ''}`} onClick={() => updateOpt(cafeId, 'temp', 'ice')}>
        ICE
      </button>
    </div>
  );
}

function CafeSizes({ cafeId, size, updateOpt }) {
  return (
    <div className="cafe-toggle-group">
      <button type="button" className={`cafe-size-btn ${size === 'M' ? 'active' : ''}`} onClick={() => updateOpt(cafeId, 'size', 'M')}>
        M
      </button>
      <button type="button" className={`cafe-size-btn ${size === 'L' ? 'active' : ''}`} onClick={() => updateOpt(cafeId, 'size', 'L')}>
        L
      </button>
    </div>
  );
}

function CafeOrderBar({ price, onOrder }) {
  return (
    <div className="cafe-actions-order">
      <div className="cafe-price-display">
        <span className="cafe-price-display__num">￥{Number(price).toLocaleString()}</span>
        <span className="cafe-price-display__suffix">〜</span>
      </div>
      <button type="button" className="cafe-order-btn" onClick={onOrder}>
        ＋ 追加
      </button>
    </div>
  );
}

export function KitchenStaffCafeMenu() {
  const { addToCart } = useRetailStaffCart();
  const [opts, setOpts] = useState({
    americano: { temp: 'hot', size: 'M', price: CAFE_PRICE_BY_SIZE.americano.M },
    latte: { temp: 'hot', size: 'M', price: CAFE_PRICE_BY_SIZE.latte.M },
    strawberry: { size: 'M', price: CAFE_PRICE_BY_SIZE.strawberry.M },
    chocolata: { size: 'M', price: CAFE_PRICE_BY_SIZE.chocolata.M },
  });

  const updateOpt = (id, field, val) => {
    setOpts((prev) => {
      const cur = prev[id];
      const next = { ...cur, [field]: val };
      const table = CAFE_PRICE_BY_SIZE[id];
      if (table && field === 'size') next.price = table[next.size];
      return { ...prev, [id]: next };
    });
  };

  return (
    <main className="main-content kitchen-staff-retail-menu kitchen-staff-retail-menu--cafe kitchen-staff-retail-scope">
      <div className="cafe-wrapper">
        <div className="kitchen-staff-hero-list kitchen-staff-hero-list--cols-4">
          <div className="cafe-card cafe-card-bg-beige">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">コーヒー</h3>
                <p className="cafe-subtitle">Coffee</p>
                <p className="cafe-desc">
                  グァテマラ産・中深煎りの豆。
                  <br />
                  ホット・アイスご用意しています。
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥420 / ￥540</span>
                  <span className="cafe-price-tax-note">（税込）</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-green"
                productStyle={{
                  backgroundImage: opts.americano.temp === 'hot' ? staffBg('hotCoffee') : staffBg('iceCoffee'),
                }}
                badgeStyle={{ backgroundImage: staffBg('coffeeBadge') }}
              />
            </div>

            <div className="cafe-actions-row">
              <div className="cafe-toggles">
                <CafeTempIce cafeId="americano" temp={opts.americano.temp} updateOpt={updateOpt} />
                <CafeSizes cafeId="americano" size={opts.americano.size} updateOpt={updateOpt} />
              </div>
              <CafeOrderBar
                price={opts.americano.price}
                onOrder={() =>
                  addToCart({
                    id: `cafe-ameri-${opts.americano.temp}-${opts.americano.size}`,
                    name: `コーヒー（${opts.americano.temp.toUpperCase()}/${opts.americano.size}）`,
                    price: opts.americano.price,
                  })
                }
              />
            </div>
          </div>

          <div className="cafe-card cafe-card-bg-blue">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">カフェラテ</h3>
                <p className="cafe-subtitle">Cafe Latte</p>
                <p className="cafe-desc">
                  エスプレッソに、
                  <br />
                  北海道産ジャージーミルク。
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥540 / ￥640</span>
                  <span className="cafe-price-tax-note">（税込）</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-green"
                productStyle={{ backgroundImage: staffBg('iceLatte') }}
                badgeStyle={{ backgroundImage: staffBg('latteBadge') }}
              />
            </div>
            <div className="cafe-actions-row">
              <div className="cafe-toggles">
                <CafeTempIce cafeId="latte" temp={opts.latte.temp} updateOpt={updateOpt} />
                <CafeSizes cafeId="latte" size={opts.latte.size} updateOpt={updateOpt} />
              </div>
              <CafeOrderBar
                price={opts.latte.price}
                onOrder={() =>
                  addToCart({
                    id: `cafe-latte-${opts.latte.temp}-${opts.latte.size}`,
                    name: `カフェラテ（${opts.latte.temp.toUpperCase()}/${opts.latte.size}）`,
                    price: opts.latte.price,
                  })
                }
              />
            </div>
          </div>

          <div className="cafe-card cafe-card-bg-pink">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">生いちごミルク</h3>
                <p className="cafe-subtitle">Fresh Strawberry Milk</p>
                <p className="cafe-desc">
                  自家製いちごソースと、
                  <br />
                  リッチな苺みるく。
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥580 / ￥680</span>
                  <span className="cafe-price-tax-note">（税込）</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-pink"
                productStyle={{ backgroundImage: staffBg('strawberry') }}
                badgeStyle={{ backgroundImage: staffBg('strawberryBadge') }}
              />
            </div>
            <div className="cafe-actions-row">
              <div className="cafe-toggles">
                <CafeSizes cafeId="strawberry" size={opts.strawberry.size} updateOpt={updateOpt} />
              </div>
              <CafeOrderBar
                price={opts.strawberry.price}
                onOrder={() =>
                  addToCart({
                    id: `cafe-straw-${opts.strawberry.size}`,
                    name: `生いちごミルク（${opts.strawberry.size}）`,
                    price: opts.strawberry.price,
                  })
                }
              />
            </div>
          </div>

          <div className="cafe-card cafe-card-bg-beige">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">ラテチョコラータ</h3>
                <p className="cafe-subtitle">Latte Chocolata</p>
                <p className="cafe-desc">
                  濃厚チョコソースと、
                  <br />
                  北海道産ジャージーミルク。
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥580 / ￥680</span>
                  <span className="cafe-price-tax-note">（税込）</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-brown"
                productStyle={{ backgroundImage: staffBg('chocolata') }}
                badgeStyle={{ backgroundImage: staffBg('chocolataBadge') }}
              />
            </div>
            <div className="cafe-actions-row">
              <div className="cafe-toggles">
                <CafeSizes cafeId="chocolata" size={opts.chocolata.size} updateOpt={updateOpt} />
              </div>
              <CafeOrderBar
                price={opts.chocolata.price}
                onOrder={() =>
                  addToCart({
                    id: `cafe-choco-${opts.chocolata.size}`,
                    name: `ラテチョコラータ（${opts.chocolata.size}）`,
                    price: opts.chocolata.price,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * 厨房テイクアウト：ソフトクリーム（文字一覧・客席の画像UIは使わない）
 * @param {{
 *   name: string,
 *   note?: string,
 *   options: Array<{ key: string, label: string, price: number }>,
 *   selectedKey: string,
 *   onSelect: (key: string) => void,
 *   onAdd: () => void,
 *   fixedPrice?: number,
 *   displayPrice?: number,
 * }} props
 */
function KitchenStaffSoftcreamRow({ name, note, options, selectedKey, onSelect, onAdd, fixedPrice, displayPrice }) {
  const selected = options.find((o) => o.key === selectedKey) ?? options[0];
  const price = displayPrice ?? selected?.price ?? fixedPrice ?? 0;

  return (
    <article className="kretail-soft-row">
      <div className="kretail-soft-row__left">
        <h3 className="kretail-soft-row__name">{name}</h3>
        {note ? <span className="kretail-soft-row__note">{note}</span> : null}
        {options.length > 1 ? (
          <div className="kretail-soft-row__opts" role="group" aria-label={`${name}の選択`}>
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`kretail-soft-row__opt${selectedKey === opt.key ? ' kretail-soft-row__opt--on' : ''}`}
                onClick={() => onSelect(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="kretail-soft-row__right">
        <span className="kretail-soft-row__price">
          ￥{price.toLocaleString()}
          <small className="kretail-soft-row__tax">税込</small>
        </span>
        <button type="button" className="kretail-soft-row__add" onClick={onAdd}>
          追加
        </button>
      </div>
    </article>
  );
}

export function KitchenStaffFruitStudioMenu() {
  const { addToCart } = useRetailStaffCart();
  const [fruitSize, setFruitSize] = useState('レギュラー');
  const [softType, setSoftType] = useState('コーン');

  const fruitOpts = [
    { key: 'ミニ', label: 'ミニ', price: 660 },
    { key: 'レギュラー', label: 'レギュラー', price: 880 },
  ];
  const softOpts = [
    { key: 'コーン', label: 'コーン', price: 460 },
    { key: 'カップ', label: 'カップ', price: 460 },
  ];

  return (
    <div className="kitchen-staff-retail-menu kitchen-staff-retail-menu--soft kretail-soft-list">
      <h2 className="kretail-soft-list__title">ソフトクリーム</h2>
      <p className="kretail-soft-list__lead">商品名・選択肢・価格を確認して「追加」</p>

      <KitchenStaffSoftcreamRow
        name="本日のソフトクリーム"
        note="フルーツは日替わり"
        options={fruitOpts}
        selectedKey={fruitSize}
        onSelect={setFruitSize}
        onAdd={() => {
          const o = fruitOpts.find((x) => x.key === fruitSize) ?? fruitOpts[1];
          addToCart({
            id: `fr-fruit-${o.key}`,
            name: `本日のソフトクリーム（${o.label}）`,
            price: o.price,
          });
        }}
      />

      <KitchenStaffSoftcreamRow
        name="ジェラ生ソフト"
        note="十勝ミルク使用"
        options={softOpts}
        selectedKey={softType}
        onSelect={setSoftType}
        onAdd={() => {
          const o = softOpts.find((x) => x.key === softType) ?? softOpts[0];
          addToCart({
            id: `fr-soft-${o.key}`,
            name: `ジェラ生ソフト（${o.label}）`,
            price: o.price,
          });
        }}
      />

      <KitchenStaffSoftcreamRow
        name="アフォガード"
        options={[]}
        selectedKey=""
        fixedPrice={680}
        onSelect={() => {}}
        onAdd={() => addToCart({ id: 'fr-affogato', name: 'アフォガード', price: 680 })}
      />
    </div>
  );
}

export function KitchenStaffTakeoutSweetsMenu() {
  const { addToCart } = useRetailStaffCart();
  return <TakeoutSweetsMenuView addToCart={addToCart} variant="kitchen" PageHeader={PageHeaderImage} />;
}

/** 日計・売上カレンダーに載せる区分（卓番ではない） */
const LEDGER_TAKEOUT_GUEST_LABEL = 'テイクアウト客';

/**
 * @param {object} props
 * @param {() => void} [props.onRetailCheckoutComplete] 会計記録後に呼ぶ（例：お会計済みタブへ）
 */
export function KitchenStaffRetailHub({ onRetailCheckoutComplete }) {
  const [sub, setSub] = useState('fruit');
  /** @type {{ locale: 'ja'|'en', men: number, women: number, children: number } | null} */
  const [retailStats, setRetailStats] = useState(null);
  /** @type {Array<{ key: string, id: string, name: string, price: number, qty: number }>} */
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState(null);

  useEffect(() => {
    setCheckoutMsg(null);
  }, [cart]);

  const addToCart = useCallback((item) => {
    if (!retailStats) return;
    const id = String(item.id ?? '');
    const name = String(item.name ?? '');
    const price = Math.max(0, Number(item.price) || 0);
    if (!id || price <= 0) return;
    setCart((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { key: `${id}-${Date.now()}`, id, name, price, qty: 1 }];
    });
  }, [retailStats]);

  const cartCtx = useMemo(() => ({ addToCart }), [addToCart]);

  const subtotal = useMemo(() => cart.reduce((s, r) => s + r.price * r.qty, 0), [cart]);

  const bumpQty = (key, delta) => {
    setCart((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      if (i < 0) return prev;
      const row = prev[i];
      const q = row.qty + delta;
      if (q <= 0) return prev.filter((r) => r.key !== key);
      const next = [...prev];
      next[i] = { ...row, qty: q };
      return next;
    });
  };

  const removeLine = (key) => {
    setCart((prev) => prev.filter((r) => r.key !== key));
  };

  const commitLedger = (payment) => {
    setCheckoutMsg(null);
    if (!retailStats) {
      setCheckoutMsg('先に「人数・言語」の入力を完了してください。');
      return;
    }
    const stock = assertTakeoutSweetsCart(cart);
    if (!stock.ok) {
      setCheckoutMsg(
        `在庫が足りません（${stock.id}: 残り ${stock.have}、ご希望 ${stock.need}）。カートで数量を減らしてください。`,
      );
      return;
    }
    const normalSubtotal = cart.reduce((s, r) => s + r.price * r.qty, 0);
    if (normalSubtotal <= 0) return;
    const total = payment === 'card_5pct' ? Math.ceil(normalSubtotal * 1.05) : normalSubtotal;
    const lines = cart.map((r) => ({
      kind: 'normal',
      name: r.qty > 1 ? `${r.name} ×${r.qty}` : r.name,
      price: r.price * r.qty,
      itemId: r.id,
    }));
    const normalCount = cart.reduce((s, r) => s + r.qty, 0);
    appendDailyLedgerEntry({
      recordedAt: Date.now(),
      tableKey: 'default::takeout-guest',
      tableLabel: LEDGER_TAKEOUT_GUEST_LABEL,
      payment,
      total,
      normalSubtotal,
      nomihodaiPlanYen: 0,
      normalCount,
      nomihodaiCount: 0,
      lines,
      hadNomihodaiCheckout: false,
      checkoutMemo: '店内飲食なし・テイクアウト客（スタッフ手入力）',
      partyMen: retailStats.men,
      partyWomen: retailStats.women,
      partyChildren: retailStats.children,
      guestUiLocale: retailStats.locale,
      orderSource: 'staff_retail',
    });
    applyTakeoutSweetsSales(cart.map((r) => ({ id: r.id, qty: r.qty })));
    setCart([]);
    setRetailStats(null);
    setCheckoutOpen(false);
    setCheckoutMsg(null);
    try {
      onRetailCheckoutComplete?.();
    } catch {
      /* ignore */
    }
  };

  return (
    <RetailStaffCartContext.Provider value={cartCtx}>
      <div className="kitchen-retail-root">
        <div className="kitchen-retail-hub">
          {retailStats ? (
            <div className="kitchen-retail-hub__stats-bar">
              <div className="kitchen-retail-hub__stats-chips" aria-label="入力済み人数">
                <span className={`iou-chip iou-chip--locale-${retailStats.locale}`}>
                  {retailStats.locale === 'en' ? '外' : '日'}
                </span>
                <span className="iou-chip">男{retailStats.men}</span>
                <span className="iou-chip">女{retailStats.women}</span>
                <span className="iou-chip">子{retailStats.children}</span>
              </div>
              <button
                type="button"
                className="kitchen-retail-hub__stats-reset"
                onClick={() => setRetailStats(null)}
                aria-label="人数を入れ直す"
                title="入れ直す"
              >
                ↺
              </button>
            </div>
          ) : null}
          <div className="kitchen-retail-hub__top">
            <div className="kitchen-retail-hub__toolbar">
              <div className="kitchen-retail-hub__toolbar-row">
                <span className="kitchen-retail-hub__label">会計の登録区分</span>
                <strong className="kitchen-retail-hub__current kitchen-retail-hub__current--pill">{LEDGER_TAKEOUT_GUEST_LABEL}</strong>
              </div>
            </div>

            <div className="kitchen-retail-hub__tabs" role="tablist" aria-label="ソフトクリーム・カフェドリンク・テイクアウト">
              <button
                type="button"
                role="tab"
                aria-selected={sub === 'fruit'}
                className={`kitchen-retail-hub__tab kitchen-retail-hub__tab--fruit${sub === 'fruit' ? ' is-active' : ''}`}
                onClick={() => setSub('fruit')}
              >
                ソフトクリーム
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sub === 'cafe'}
                className={`kitchen-retail-hub__tab kitchen-retail-hub__tab--cafe${sub === 'cafe' ? ' is-active' : ''}`}
                onClick={() => setSub('cafe')}
              >
                カフェドリンク
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sub === 'takeout'}
                className={`kitchen-retail-hub__tab kitchen-retail-hub__tab--takeout${sub === 'takeout' ? ' is-active' : ''}`}
                onClick={() => setSub('takeout')}
              >
                テイクアウトスイーツ
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sub === 'aburasoba'}
                className={`kitchen-retail-hub__tab kitchen-retail-hub__tab--aburasoba${sub === 'aburasoba' ? ' is-active' : ''}`}
                onClick={() => setSub('aburasoba')}
              >
                油そば
              </button>
            </div>
          </div>

          <div className="kitchen-retail-hub__body">
            <div className="kitchen-retail-hub__scroll">
              {!retailStats ? (
                <div className="kitchen-retail-hub__stats-pane">
                  <KitchenRetailStatsGate onConfirm={(stats) => setRetailStats(stats)} />
                </div>
              ) : null}
              {retailStats && sub === 'fruit' ? <KitchenStaffFruitStudioMenu /> : null}
              {retailStats && sub === 'cafe' ? <KitchenStaffCafeMenu /> : null}
              {retailStats && sub === 'takeout' ? <KitchenStaffTakeoutSweetsMenu /> : null}
              {retailStats && sub === 'aburasoba' ? <KitchenStaffAburasobaTakeoutMenu addToCart={addToCart} /> : null}
              {retailStats && sub !== 'aburasoba' ? <KitchenRetailVerbalPanel addToCart={addToCart} /> : null}
            </div>

            <aside
              className={`kitchen-retail-cart${!retailStats ? ' kitchen-retail-cart--locked' : ''}`}
              aria-label="テイクアウト用カート"
            >
              <div className="kitchen-retail-cart__head">
                <span className="kitchen-retail-cart__title">カート</span>
                <strong className="kitchen-retail-cart__sum">￥{subtotal.toLocaleString()}</strong>
              </div>
              {!retailStats ? (
                <p className="kitchen-retail-cart__empty">左で「日／外」と人数を入力すると注文できます</p>
              ) : cart.length === 0 ? (
                <p className="kitchen-retail-cart__empty">商品の「追加」からカートに入れてください</p>
              ) : (
                <ul className="kitchen-retail-cart__list">
                  {cart.map((row) => (
                    <li key={row.key} className="kitchen-retail-cart__row">
                      <div className="kitchen-retail-cart__row-head">
                        <div className="kitchen-retail-cart__name">{row.name}</div>
                        <button type="button" className="kitchen-retail-cart__remove" onClick={() => removeLine(row.key)}>
                          削除
                        </button>
                      </div>
                      <div className="kitchen-retail-cart__row-body">
                        <span className="kitchen-retail-cart__unit">単価 ￥{row.price.toLocaleString()}</span>
                        <div className="kitchen-retail-cart__qty">
                          <button type="button" className="kitchen-retail-cart__qtybtn" onClick={() => bumpQty(row.key, -1)} aria-label="数量を減らす">
                            −
                          </button>
                          <span className="kitchen-retail-cart__qtynum">{row.qty}</span>
                          <button type="button" className="kitchen-retail-cart__qtybtn" onClick={() => bumpQty(row.key, 1)} aria-label="数量を増やす">
                            ＋
                          </button>
                        </div>
                      </div>
                      <div className="kitchen-retail-cart__lineamt">小計 ￥{(row.price * row.qty).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="kitchen-retail-cart__actions">
                <button
                  type="button"
                  className="kitchen-retail-cart__checkout"
                  disabled={!retailStats || cart.length === 0}
                  onClick={() => {
                    setCheckoutMsg(null);
                    setCheckoutOpen(true);
                  }}
                >
                  お会計へ
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {checkoutOpen ? (
        <div
          className="kitchen-checkout-page-overlay kitchen-retail-checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kitchen-retail-checkout-title"
          onClick={() => setCheckoutOpen(false)}
        >
          <div className="kitchen-checkout-page" onClick={(e) => e.stopPropagation()}>
            <header className="kitchen-checkout-page__head">
              <div>
                <h2 id="kitchen-retail-checkout-title" className="kitchen-checkout-page__title">
                  テイクアウト会計（{LEDGER_TAKEOUT_GUEST_LABEL}）
                </h2>
              </div>
            </header>

            {checkoutMsg ? (
              <p className="kitchen-checkout-page__warn" role="alert">
                {checkoutMsg}
              </p>
            ) : null}

            <section className="kitchen-checkout-page__slip" aria-labelledby="kitchen-retail-slip-h">
              <h3 id="kitchen-retail-slip-h" className="kitchen-checkout-page__h3">
                明細（カート）
              </h3>
              <ul className="kitchen-checkout-page__lines">
                {cart.map((row) => (
                  <li key={row.key} className="kitchen-checkout-page__line">
                    <span className="kitchen-checkout-page__line-ico" aria-hidden>
                      🥡
                    </span>
                    <span className="kitchen-checkout-page__line-name">
                      {row.qty > 1 ? `${row.name} ×${row.qty}` : row.name}
                    </span>
                    <span className="kitchen-checkout-page__line-bill">￥{(row.price * row.qty).toLocaleString()}（税込）</span>
                  </li>
                ))}
              </ul>
              <div className="kitchen-checkout-page__totals">
                <div>点数 {cart.reduce((s, r) => s + r.qty, 0)}</div>
                <div>小計（税込）￥{subtotal.toLocaleString()}</div>
                <strong className="kitchen-checkout-page__grand">会計合計（税込）￥{subtotal.toLocaleString()}</strong>
                <p className="kitchen-checkout-page__card5-note">
                  カード・5%（税込＋手数料、端数切上げ）： <strong>￥{Math.ceil(subtotal * 1.05).toLocaleString()}</strong>
                </p>
              </div>
            </section>

            <p className="kitchen-checkout-page__pay-hint">お支払い方法を選択して会計を確定</p>
            <div className="kitchen-checkout-paygrid kitchen-checkout-paygrid--3">
              <button type="button" className="kitchen-checkout-pay kitchen-checkout-pay--cash" onClick={() => commitLedger('cash')}>
                現金・税込（￥{subtotal.toLocaleString()}）
              </button>
              <button type="button" className="kitchen-checkout-pay kitchen-checkout-pay--card" onClick={() => commitLedger('card')}>
                カード・税込（￥{subtotal.toLocaleString()}）
              </button>
              <button type="button" className="kitchen-checkout-pay kitchen-checkout-pay--card5" onClick={() => commitLedger('card_5pct')}>
                カード・税込＋5%（￥{Math.ceil(subtotal * 1.05).toLocaleString()}）
              </button>
            </div>
            <div className="kitchen-checkout-page__footer-actions">
              <button type="button" className="kitchen-checkout-cancel" onClick={() => setCheckoutOpen(false)}>
                戻る
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </RetailStaffCartContext.Provider>
  );
}
