import React, { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import NomihodaiGuestBanner from './NomihodaiGuestBanner.jsx';
import { NomihodaiGuestCheckoutThankYou, NomihodaiGuestFarewellFlow } from './NomihodaiGuestCheckoutScreens.jsx';
import { NomihodaiTabRouter } from './NomihodaiGuestFlow.jsx';
import DrinkHeroImage from './DrinkHeroImage.jsx';
import { getDrinkSectionHeroCandidates } from './data/drinkHeroImages.js';
import { DRINK_MENU_GUEST_ROWS } from './data/defaultDrinkMenu.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getAlcoholTableCharge, formatAlcoholChargeLineForGuest } from './alcoholTableCharge.js';
import { getNomihodaiForTable } from './nomihodaiSession.js';
import { useDrinkMenuForGuest } from './useDrinkMenuForGuest.js';
import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';
import {
  guestCartLineDisplay,
  guestAburasobaToppingLabel,
  guestDrinkRowName,
  guestDrinkSectionHint,
  guestTakeoutItemDisplayName,
} from './guestMenuDisplay.js';
import { isSupabaseConfigured } from './supabaseClient.js';
import SupabaseConfigMissingScreen from './SupabaseConfigMissingScreen.jsx';
import SupabaseConnectionBanner from './SupabaseConnectionBanner.jsx';
import GuestPromoScreensaver from './GuestPromoScreensaver.jsx';
import GuestOnboardingGate from './GuestOnboardingGate.jsx';
import TakeoutSweetsMenuView from './TakeoutSweetsMenuView.jsx';
import SideDishMenuGuest from './SideDishMenuGuest.jsx';
import {
  retailAssetUrl,
  retailCssBgUrl,
  GUEST_CAFE_IMAGES,
  GUEST_FRUIT_IMAGES,
  GUEST_PAGE_HEADERS,
} from './retailMenuAssets.js';

const NOMIHODAI_PLAN_CART_ID = 'nomihodai-plan-charge';
import { assertTakeoutSweetsOrderItems, applyTakeoutSweetsSales } from './takeoutSweetsInventory.js';

const ASSET_BASE = import.meta.env.BASE_URL;

/** public 直下のパス（日本語ファイル名はセグメントごとに encodeURIComponent） */
function assetUrl(path) {
  const normalized = String(path).replace(/^\//, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return ASSET_BASE || '/';
  const encoded = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const base = ASSET_BASE || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${encoded}`;
}

function cssBgUrl(path) {
  return `url("${assetUrl(path)}")`;
}

/** 油そばヒーロー中央の丼写真（帯ヘッダー用 PNG とは別。欠落時はヘッダー画像にフォールバック） */
const ABURASOBA_HERO_PHOTO_FILES = ['油そば坦々-メニュー完_0008_レイヤー-1.png', 'aburasobahedda-.png'];

/** ページ先頭ヘッダー PNG（書き出し実名を先頭 → 旧短名はフォールバック） */
const PAGE_HEADER_FILES = {
  aburasoba: ['aburasobahedda-.png'],
  sidedish: ['名称未設定-5_0004_saidomenyu-hedda-.png', 'saidomenyu-hedda-.png'],
  cafe: GUEST_PAGE_HEADERS.cafe,
  fruit: GUEST_PAGE_HEADERS.fruit,
  takeout: GUEST_PAGE_HEADERS.takeout,
};

const guestBg = (key) => retailCssBgUrl('guest', GUEST_CAFE_IMAGES[key]);

function PageHeaderImage({ pageKey, alt, lift }) {
  const candidates = PAGE_HEADER_FILES[pageKey];
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [pageKey]);

  if (!candidates?.length) return null;

  const exhausted = attempt >= candidates.length;
  const src = !exhausted ? assetUrl(candidates[attempt]) : '';

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

function AburasobaHeroPhoto() {
  const [attempt, setAttempt] = useState(0);
  const exhausted = attempt >= ABURASOBA_HERO_PHOTO_FILES.length;
  const src = !exhausted ? assetUrl(ABURASOBA_HERO_PHOTO_FILES[attempt]) : '';

  return (
    <div className="abu-hero-img-area">
      {!exhausted ? (
        <img
          key={src}
          src={src}
          alt=""
          className="abu-hero-img abu-hero-img--photo"
          decoding="async"
          onError={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <div
          className="abu-hero-img abu-hero-img--photo-fallback"
          style={{
            backgroundImage: cssBgUrl('aburasobahedda-.png'),
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

const ABURASOBA_PRICES = {
  normal: { 小: 980, 並: 1130, 大: 1330 },
  spicy: { 小: 980, 並: 1180, 大: 1380 },
  cheese: { 小: 980, 並: 1180, 大: 1380 },
};

const ABURASOBA_BOWL_META = {
  normal: { key: 'normal', title: '米風亭 油そば' },
  spicy: { key: 'spicy', title: '辛々担々 油そば' },
  cheese: { key: 'cheese', title: 'チーズ 油そば' },
};

function buildAburasobaToppings() {
  return [
    { id: 'top-chashu', name: '細切り\nチャーシュー', price: 300, text: 'Chashu', image: assetUrl('名称未設定-1_0000_tya-syu-.png') },
    { id: 'top-spicy', name: '辛みそ\nひき肉', price: 300, text: 'Miso', image: assetUrl('名称未設定-1_0001_nikumiso.png') },
    { id: 'top-menma', name: 'メンマ', price: 200, text: 'Menma', image: assetUrl('topping-menma.png') },
    { id: 'top-nori', name: 'のり2枚', price: 200, text: 'Nori', image: assetUrl('名称未設定-1_0002_nori.png') },
    { id: 'top-egg', name: 'うずら味玉', price: 200, text: 'Egg', image: assetUrl('名称未設定-1_0002_uZURA.png') },
    { id: 'top-garlic', name: 'フライド\nガーリック', price: 150, text: 'Garlic', image: assetUrl('名称未設定-1_0000_furaidoga-rikku.png') },
    { id: 'top-mayo', name: 'マヨネーズ', price: 150, text: 'Mayo', image: assetUrl('名称未設定-1_0001_mayone-zu.png') },
    { id: 'top-cheese', name: '粉チーズ', price: 150, text: 'Cheese', image: assetUrl('名称未設定-1_0000_konati-zu.png') },
  ];
}

// === ABURASOBA PAGE COMPONENT ===
function AburasobaMenu({ addToCart }) {
  const prices = ABURASOBA_PRICES;
  const toppings = buildAburasobaToppings();
  const { t: ut, locale } = useGuestUiLocale();

  const [opts, setOpts] = useState({
    normal: { size: '並', price: 1130 },
    spicy: { size: '並', price: 1180 },
    cheese: { size: '並', price: 1180 },
  });

  /** 'normal' | 'spicy' | 'cheese' | null */
  const [flowBowl, setFlowBowl] = useState(null);
  /** 1: サイズ 2: トッピング */
  const [flowStep, setFlowStep] = useState(1);
  const [flowSize, setFlowSize] = useState('並');
  const [flowToppingIds, setFlowToppingIds] = useState([]);

  const updateOpt = (type, size) => {
    setOpts((prev) => ({
      ...prev,
      [type]: { size, price: prices[type][size] },
    }));
  };

  const openFlow = (bowlKey) => {
    setFlowBowl(bowlKey);
    setFlowStep(1);
    setFlowSize(opts[bowlKey].size);
    setFlowToppingIds([]);
  };

  const closeFlow = () => {
    setFlowBowl(null);
    setFlowStep(1);
    setFlowToppingIds([]);
  };

  const toggleFlowTopping = (id) => {
    setFlowToppingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const confirmAddToCart = () => {
    if (!flowBowl) return;
    const size = flowSize;
    const basePrice = prices[flowBowl][size];
    const toppingObjs = flowToppingIds
      .map((id) => toppings.find((t) => t.id === id))
      .filter(Boolean);
    const toppingsPrice = toppingObjs.reduce((s, t) => s + t.price, 0);
    const totalPrice = basePrice + toppingsPrice;
    const sortedIds = [...flowToppingIds].sort();
    const cartId = `abu:${flowBowl}:${size}:${sortedIds.join('|')}`;
    const bowlTitle = ABURASOBA_BOWL_META[flowBowl].title;
    addToCart({
      id: cartId,
      name: `${bowlTitle}（${size}）`,
      price: totalPrice,
      aburasobaDetail: {
        bowlKey: flowBowl,
        bowlTitle,
        size,
        toppings: toppingObjs.map((t) => ({
          id: t.id,
          name: t.name.replace(/\n/g, ''),
          text: t.text,
          price: t.price,
        })),
      },
    });
    closeFlow();
  };

  const flowBasePrice = flowBowl ? prices[flowBowl][flowSize] : 0;
  const flowToppingsExtra = flowToppingIds.reduce((s, id) => {
    const t = toppings.find((x) => x.id === id);
    return s + (t?.price ?? 0);
  }, 0);
  const flowTotal = flowBasePrice + flowToppingsExtra;

  useEffect(() => {
    if (!flowBowl) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setFlowBowl(null);
      setFlowStep(1);
      setFlowToppingIds([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flowBowl]);

  return (
    <main className="main-content" style={{ background: '#F8F5EE' }}>
      <div className="abu-wrapper">
        <PageHeaderImage pageKey="aburasoba" alt={ut('header_aburasoba')} />
        <div className="abu-main-with-toppings">
          <div className="abu-main-hero-row">
            <p className="abu-flow-hint">
              {ut('abu_flow_hint')}
            </p>
            {/* Hero Section */}
            <section className="abu-hero">
              <div className="abu-hero-left">
                <p className="subtitle">
                  {ut('abu_hero_subtitle')}
                  <br />
                  <span className="red">{ut('abu_hero_subtitle_em')}</span>
                  {ut('abu_hero_subtitle_after')}
                </p>
                <h2 className="title">
                  {ut('abu_hero_title1')}
                  <br />
                  {ut('abu_hero_title2')}
                </h2>
                <p className="desc">{ut('abu_hero_tag')}</p>
              </div>

              <div className="abu-hero-center">
                <div className="abu-badge-no1">
                  {ut('abu_badge_pop1')}
                  <br />
                  {ut('abu_badge_pop2')}
                </div>
                <AburasobaHeroPhoto />
              </div>

              <div className="abu-hero-right">
                <div className="r-title">{ut('abu_right_title')}</div>
                <div className="r-desc">
                  {ut('abu_right_desc')
                    .split('\n')
                    .map((line, i, arr) => (
                      <Fragment key={i}>
                        {line}
                        {i < arr.length - 1 ? <br /> : null}
                      </Fragment>
                    ))}
                </div>

                <div className="abu-price-list">
                  {['小', '並', '大'].map((s) => (
                    <div className="abu-price-item" key={s} onClick={() => updateOpt('normal', s)} style={{ cursor: 'pointer' }}>
                      <div className="abu-size-circle" style={{ background: opts.normal.size === s ? '#A91E1E' : '#333' }}>
                        {locale === 'en' ? ut(s === '小' ? 'abu_size_s' : s === '大' ? 'abu_size_l' : 'abu_size_m') : s}
                      </div>
                      <div
                        className="abu-price-val"
                        style={{ color: opts.normal.size === s ? '#A91E1E' : '#333', fontWeight: opts.normal.size === s ? 'bold' : 'normal' }}
                      >
                        ￥{prices.normal[s].toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="abu-hero-actions">
                  <button type="button" className="abu-btn-red" onClick={() => openFlow('normal')}>
                    {ut('abu_add')}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="abu-main-variant-row">
            {/* Recommended Section */}
            <div className="abu-section-header">
              <div className="abu-section-title">{ut('abu_section_other')}</div>
              <div className="abu-section-line"></div>
            </div>

            <div className="abu-rec-grid">
            {/* Spicy Aburasoba */}
            <div className="abu-rec-card">
              <div className="abu-rec-info">
                <div className="abu-rec-title">{ut('abu_rec_spicy_title')}</div>
                <div className="abu-rec-desc">
                  {ut('abu_rec_spicy_desc')
                    .split('\n')
                    .map((line, i, arr) => (
                      <Fragment key={i}>
                        {line}
                        {i < arr.length - 1 ? <br /> : null}
                      </Fragment>
                    ))}
                </div>
                <div className="abu-rec-bottom">
                  <div className="abu-rec-img" style={{ backgroundImage: cssBgUrl('名称未設定-1_0000_tantan.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                  <div className="abu-rec-price-area">
                    <div className="abu-rec-price-col">
                      {['小', '並', '大'].map((s) => (
                        <div
                          key={s}
                          className={`abu-rec-size-row${opts.spicy.size === s ? ' abu-rec-size-row--active' : ''}`}
                          onClick={() => updateOpt('spicy', s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              updateOpt('spicy', s);
                            }
                          }}
                        >
                          <div className="abu-size-circle abu-size-circle--rec">
                            {locale === 'en' ? ut(s === '小' ? 'abu_size_s' : s === '大' ? 'abu_size_l' : 'abu_size_m') : s}
                          </div>
                          <div className="abu-rec-size-price">￥{prices.spicy[s].toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="abu-btn-full" onClick={() => openFlow('spicy')}>
                      {ut('abu_add')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cheese Aburasoba */}
            <div className="abu-rec-card">
              <div className="abu-rec-info">
                <div className="abu-rec-title">{ut('abu_rec_cheese_title')}</div>
                <div className="abu-rec-desc">
                  {ut('abu_rec_cheese_desc')
                    .split('\n')
                    .map((line, i, arr) => (
                      <Fragment key={i}>
                        {line}
                        {i < arr.length - 1 ? <br /> : null}
                      </Fragment>
                    ))}
                </div>
                <div className="abu-rec-bottom">
                  <div className="abu-rec-img" style={{ backgroundImage: cssBgUrl('abu-cheese-aburasoba.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                  <div className="abu-rec-price-area">
                    <div className="abu-rec-price-col">
                      {['小', '並', '大'].map((s) => (
                        <div
                          key={s}
                          className={`abu-rec-size-row${opts.cheese.size === s ? ' abu-rec-size-row--active' : ''}`}
                          onClick={() => updateOpt('cheese', s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              updateOpt('cheese', s);
                            }
                          }}
                        >
                          <div className="abu-size-circle abu-size-circle--rec">
                            {locale === 'en' ? ut(s === '小' ? 'abu_size_s' : s === '大' ? 'abu_size_l' : 'abu_size_m') : s}
                          </div>
                          <div className="abu-rec-size-price">￥{prices.cheese[s].toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="abu-btn-full" onClick={() => openFlow('cheese')}>
                      {ut('abu_add')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* 3段目：トッピング（横並びグリッド） */}
          <div className="abu-toppings-wrap">
            <div className="abu-toppings-header">
              <div className="abu-section-title">{ut('abu_toppings_header')}</div>
              <div className="abu-toppings-note">{ut('abu_toppings_tax')}</div>
            </div>

            <div className="abu-toppings-list">
              {toppings.map((t) => (
                <div
                  className="abu-topping-item"
                  key={t.id}
                  onClick={() => {
                    const nameJa = t.name.replace('\n', '');
                    const nameEnRaw = guestAburasobaToppingLabel(t, 'en');
                    const nameEnNorm = nameEnRaw ? String(nameEnRaw).replace(/\n/g, ' ').trim() : '';
                    const nameEn = nameEnNorm && nameEnNorm !== nameJa ? nameEnNorm : undefined;
                    addToCart({
                      id: t.id,
                      name: nameJa,
                      ...(nameEn ? { nameEn } : {}),
                      price: t.price,
                    });
                  }}
                >
                  <div
                    className="abu-topping-img"
                    style={{
                      backgroundImage: `url("${t.image || `https://via.placeholder.com/100x100/transparent/333?text=${t.text}`}")`,
                    }}
                  />
                  <div className="abu-topping-name">
                    {guestAburasobaToppingLabel(t, locale)
                      .split('\n')
                      .map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                  </div>
                  <div className="abu-topping-price">￥{t.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {flowBowl && (
          <div
            className="abu-flow-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="abu-flow-title"
            onClick={closeFlow}
          >
            <div className="abu-flow-modal" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="abu-flow-close" aria-label={ut('bill_close')} onClick={closeFlow}>
                ×
              </button>

              {flowStep === 1 && (
                <>
                  <h2 id="abu-flow-title" className="abu-flow-title">
                    {ut('abu_flow_pick_size')}
                  </h2>
                  <p className="abu-flow-bowl-name">
                    {locale === 'en' ? ut(`abu_bowl_${flowBowl}`) : ABURASOBA_BOWL_META[flowBowl].title}
                  </p>
                  <div className="abu-flow-size-grid">
                    {['小', '並', '大'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`abu-flow-size-btn ${flowSize === s ? 'active' : ''}`}
                        onClick={() => setFlowSize(s)}
                      >
                        <span className="abu-flow-size-label">
                          {locale === 'en' ? ut(s === '小' ? 'abu_size_s' : s === '大' ? 'abu_size_l' : 'abu_size_m') : s}
                        </span>
                        <span className="abu-flow-size-price">￥{prices[flowBowl][s].toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="abu-flow-primary" onClick={() => setFlowStep(2)}>
                    {ut('abu_flow_next_toppings')}
                  </button>
                </>
              )}

              {flowStep === 2 && (
                <>
                  <h2 id="abu-flow-title" className="abu-flow-title">
                    {ut('abu_flow_pick_toppings')}
                  </h2>
                  <p className="abu-flow-note">{ut('abu_flow_topping_note')}</p>
                  <div className="abu-flow-topping-grid">
                    {toppings.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`abu-flow-topping-cell ${flowToppingIds.includes(t.id) ? 'selected' : ''}`}
                        onClick={() => toggleFlowTopping(t.id)}
                      >
                        <div
                          className="abu-flow-topping-img"
                          style={{
                            backgroundImage: `url("${t.image || `https://via.placeholder.com/100x100/transparent/333?text=${t.text}`}")`,
                          }}
                        />
                        <div className="abu-flow-topping-name">
                          {guestAburasobaToppingLabel(t, locale)
                            .split('\n')
                            .map((line, i, arr) => (
                              <Fragment key={i}>
                                {line}
                                {i < arr.length - 1 ? <br /> : null}
                              </Fragment>
                            ))}
                        </div>
                        <div className="abu-flow-topping-price">￥{t.price}</div>
                      </button>
                    ))}
                  </div>
                  <div className="abu-flow-summary">
                    <span>
                      {locale === 'en'
                        ? `${ut(`abu_bowl_${flowBowl}`)} (${ut(flowSize === '小' ? 'abu_size_s' : flowSize === '大' ? 'abu_size_l' : 'abu_size_m')}) … ￥${flowBasePrice.toLocaleString()}`
                        : `${ABURASOBA_BOWL_META[flowBowl].title}（${flowSize}） … ￥${flowBasePrice.toLocaleString()}`}
                    </span>
                    {flowToppingsExtra > 0 && (
                      <span>{ut('abu_flow_extra_line', { price: flowToppingsExtra.toLocaleString() })}</span>
                    )}
                    <strong className="abu-flow-summary-total">{ut('abu_flow_total_line', { total: flowTotal.toLocaleString() })}</strong>
                  </div>
                  <div className="abu-flow-actions">
                    <button type="button" className="abu-flow-secondary" onClick={() => setFlowStep(1)}>
                      {ut('abu_flow_back')}
                    </button>
                    <button type="button" className="abu-flow-primary" onClick={confirmAddToCart}>
                      {ut('abu_cart_to_cart')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// === SIDE DISH PAGE COMPONENT ===
function SideDishMenu({ addToCart }) {
  return <SideDishMenuGuest addToCart={addToCart} PageHeaderImage={PageHeaderImage} />;
}


function DrinkMenuCategory({ sec, addToCart, nomihodaiActive, ut, locale }) {
  return (
    <div className="drink-page-cat">
      <div className="drink-page-cat__head drink-page-cat__head--hero-inline">
        <div className="drink-page-cat__head-titles">
          {locale === 'en' ? (
            <span className="drink-page-cat__en">{sec.titleEn}</span>
          ) : (
            <>
              <span className="drink-page-cat__en">{sec.titleEn}</span>
              <span className="drink-page-cat__ja">{sec.titleJa}</span>
            </>
          )}
        </div>
        <DrinkHeroImage
          candidates={getDrinkSectionHeroCandidates(sec.id)}
          className="drink-page-cat__hero"
          imgClassName="drink-page-cat__hero-img"
        />
      </div>
      {guestDrinkSectionHint(sec, locale) ? (
        <p className="drink-page-cat__hint">{guestDrinkSectionHint(sec, locale)}</p>
      ) : null}
      <ul className="drink-page-list">
        {sec.items.map((it) => (
          <li key={it.id} className="drink-page-row">
            <span className="drink-page-row__name">{guestDrinkRowName(it, locale)}</span>
            <span className="drink-page-row__price">
              {it.price != null
                ? `￥${it.price.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}`
                : ut('drink_price_ask')}
            </span>
            {it.price != null ? (
              <button
                type="button"
                className="drink-page-row__add"
                disabled={nomihodaiActive}
                onClick={() =>
                  addToCart({
                    id: it.id,
                    name: it.name,
                    nameEn: it.nameEn,
                    price: it.price,
                  })
                }
                title={nomihodaiActive ? ut('drink_lock_title') : undefined}
              >
                {ut('drink_add')}
              </button>
            ) : (
              <span className="drink-page-row__na" title={ut('drink_row_na_title')}>
                —
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrinkMenu({ addToCart }) {
  const drinkSections = useDrinkMenuForGuest();
  const { nomihodaiActive } = useNomihodaiSession();
  const { t: ut, locale } = useGuestUiLocale();

  const drinkRows = useMemo(() => {
    const byId = Object.fromEntries((drinkSections || []).map((s) => [s.id, s]));
    const rows = DRINK_MENU_GUEST_ROWS.map((ids) => ids.map((id) => byId[id]).filter(Boolean)).filter(
      (row) => row.length > 0,
    );
    if (byId.spot?.items?.length) rows.push([byId.spot]);
    return rows;
  }, [drinkSections]);

  return (
    <main
      className={`main-content${nomihodaiActive ? ' drink-page--nomihodai-locked' : ''}`}
      style={{ background: '#FAF6ED' }}
    >
      <div className="drink-page-wrapper">
        <section className="drink-page" aria-labelledby="drink-page-heading">
          <h2 id="drink-page-heading" className="drink-page__heading">
            DRINK MENU
          </h2>
          {nomihodaiActive ? (
            <p className="drink-page__nomihodai-lock" role="status">
              {ut('drink_lock_before')}
              <strong>{ut('drink_lock_tab')}</strong>
              {ut('drink_lock_after')}
            </p>
          ) : null}
          <p className="drink-page__sub">{ut('drink_page_sub')}</p>

          <div className="drink-page__grid">
            {drinkRows.map((row, rowIndex) => (
              <div key={`drink-row-${rowIndex}`} className="drink-page__row">
                {row.map((sec) => (
                  <DrinkMenuCategory
                    key={sec.id}
                    sec={sec}
                    addToCart={addToCart}
                    nomihodaiActive={nomihodaiActive}
                    ut={ut}
                    locale={locale}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="drink-page__footer">{ut('drink_footer')}</p>
        </section>
      </div>
    </main>
  );
}

// === PIZZA PAGE COMPONENT ===
function PizzaMenu({ addToCart }) {
  const { t: ut, locale } = useGuestUiLocale();
  const pizzaHeroes = [
    {
      id: 'pz-margherita',
      nameJa: 'マルゲリータ',
      nameEn: 'Margherita',
      desc: '【トマトソース・モッツァレラ・バジル】',
      descEn: '[Tomato sauce · mozzarella · basil]',
      price: 1380,
      image: assetUrl('名称未設定-3_0004_maruge.png'),
      cardBg: 'cafe-card-bg-beige',
    },
    {
      id: 'pz-genovese',
      nameJa: 'ジェノベーゼ',
      nameEn: 'Genovese',
      desc: '【バジルソース・トマト・ベーコン】',
      descEn: '[Basil sauce · tomato · bacon]',
      price: 1480,
      image: assetUrl('名称未設定-3_0000_jenobeze.png'),
      cardBg: 'cafe-card-bg-blue',
    },
    {
      id: 'pz-bismark',
      nameJa: 'ビスマルク',
      nameEn: 'Bismark',
      desc: '【トマトソース・ベーコン・卵】',
      descEn: '[Tomato sauce · bacon · egg]',
      price: 1380,
      image: assetUrl('名称未設定-3_0002_bisumaruku.png'),
      cardBg: 'cafe-card-bg-pink',
    },
    {
      id: 'pz-quattro',
      nameJa: 'クワトロフォルマッジ',
      nameEn: 'Quattro formaggi',
      desc: '【4種のチーズ】',
      descEn: '[Four cheeses]',
      price: 1580,
      image: assetUrl('名称未設定-3_0001_kuwatoro.png'),
      cardBg: 'cafe-card-bg-white',
    },
  ];

  return (
    <main className="main-content" style={{ background: '#FAF6ED' }}>
      <div className="pizza-wrapper">
        <div className="pizza-heroes-block">
          <div className="coming-soon-overlay" aria-hidden="true">
            <div className="coming-soon-message">
              <span className="coming-soon-message__title">COMING SOON</span>
              <span className="coming-soon-message__note">{ut('pizza_coming_note')}</span>
            </div>
          </div>

          {/* カフェドリンクと同じ 2×2（cafe-grid-2）で 4 ヒーロー */}
          <div className="cafe-grid-2 pizza-heroes-grid">
          {pizzaHeroes.map((p) => (
            <div key={p.id} className={`cafe-card pizza-hero-corner ${p.cardBg}`}>
              <div className="cafe-card-top pizza-hero-top">
                <div className="cafe-card-content">
                  <h3 className="cafe-title">{locale === 'en' ? p.nameEn : p.nameJa}</h3>
                  <p className="cafe-subtitle">{locale === 'en' ? p.nameJa : p.nameEn}</p>
                  <p className="cafe-desc">{locale === 'en' ? p.descEn : p.desc}</p>
                  <p className="cafe-price-info cafe-price-info-spaced">
                    ￥{p.price.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                  </p>
                </div>
                <div className="pizza-hero-media">
                  <div
                    className="pizza-hero-photo"
                    style={{
                      backgroundImage: `url("${p.image}")`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  />
                </div>
              </div>
              <div className="cafe-actions-row">
                <div className="cafe-actions-order pizza-hero-order">
                  <button
                    type="button"
                    className="cafe-order-btn"
                    onClick={() => addToCart({ id: p.id, name: p.nameJa, nameEn: p.nameEn, price: p.price })}
                  >
                    {ut('item_add_plus')}
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px', color: '#666' }}>
            {ut('pizza_takeout_foot')}
          </div>
        </div>
      </div>
    </main>
  );
}

/** カフェ：サイズ別価格（メニュー調整はこの表だけ触ればよい） */
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
      <button type="button" className={`cafe-size-btn ${size === 'M' ? 'active' : ''}`} onClick={() => updateOpt(cafeId, 'size', 'M')}>M</button>
      <button type="button" className={`cafe-size-btn ${size === 'L' ? 'active' : ''}`} onClick={() => updateOpt(cafeId, 'size', 'L')}>L</button>
    </div>
  );
}

function CafeOrderBar({ price, onOrder }) {
  const { t: ut, locale } = useGuestUiLocale();
  const loc = locale === 'en' ? 'en-US' : 'ja-JP';
  const yen = locale === 'en' ? '¥' : '￥';
  return (
    <div className="cafe-actions-order">
      <div className="cafe-price-display">
        <span className="cafe-price-display__num">
          {yen}
          {Number(price).toLocaleString(loc)}
        </span>
        <span className="cafe-price-display__suffix">〜</span>
      </div>
      <button type="button" className="cafe-order-btn" onClick={onOrder}>
        {ut('item_add_plus')}
      </button>
    </div>
  );
}

// === CAFE PAGE COMPONENT ===
function CafeMenu({ addToCart }) {
  const { t: ut } = useGuestUiLocale();
  const [opts, setOpts] = useState({
    americano: { temp: 'hot', size: 'M', price: CAFE_PRICE_BY_SIZE.americano.M },
    latte: { temp: 'hot', size: 'M', price: CAFE_PRICE_BY_SIZE.latte.M },
    strawberry: { size: 'M', price: CAFE_PRICE_BY_SIZE.strawberry.M },
    chocolata: { size: 'M', price: CAFE_PRICE_BY_SIZE.chocolata.M },
  });

  const updateOpt = (id, field, val) => {
    setOpts(prev => {
      const cur = prev[id];
      const next = { ...cur, [field]: val };
      const table = CAFE_PRICE_BY_SIZE[id];
      if (table && field === 'size') next.price = table[next.size];
      return { ...prev, [id]: next };
    });
  };

  return (
    <main className="main-content main-content--cafe-heroes guest-menu-surface" style={{ background: '#FAF6ED' }}>
      <div className="cafe-wrapper">
        <div className="cafe-grid-2">
          {/* coffee (Americano) */}
          <div className="cafe-card cafe-card-bg-beige">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">{ut('cafe_coffee_title')}</h3>
                <p className="cafe-subtitle">{ut('cafe_sub_coffee')}</p>
                <p className="cafe-desc">
                  {ut('cafe_coffee_desc').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥420 / ￥540</span>
                  <span className="cafe-price-tax-note">{ut('cafe_tax_note')}</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-green"
                productStyle={{
                  backgroundImage: opts.americano.temp === 'hot' ? guestBg('hotCoffee') : guestBg('iceCoffee'),
                }}
                badgeStyle={{ backgroundImage: guestBg('coffeeBadge') }}
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

          {/* Cafe Latte */}
          <div className="cafe-card cafe-card-bg-blue">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">{ut('cafe_latte_title')}</h3>
                <p className="cafe-subtitle">{ut('cafe_sub_latte')}</p>
                <p className="cafe-desc">
                  {ut('cafe_latte_desc').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥540 / ￥640</span>
                  <span className="cafe-price-tax-note">{ut('cafe_tax_note')}</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-green"
                productStyle={{ backgroundImage: guestBg('iceLatte') }}
                badgeStyle={{ backgroundImage: guestBg('latteBadge') }}
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

          {/* Strawberry Milk */}
          <div className="cafe-card cafe-card-bg-pink">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">{ut('cafe_straw_title')}</h3>
                <p className="cafe-subtitle">{ut('cafe_sub_straw')}</p>
                <p className="cafe-desc">
                  {ut('cafe_straw_desc').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥580 / ￥680</span>
                  <span className="cafe-price-tax-note">{ut('cafe_tax_note')}</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-pink"
                productStyle={{ backgroundImage: guestBg('strawberry') }}
                badgeStyle={{ backgroundImage: guestBg('strawberryBadge') }}
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

          {/* Latte Chocolata */}
          <div className="cafe-card cafe-card-bg-beige">
            <div className="cafe-card-top pizza-hero-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">{ut('cafe_choco_title')}</h3>
                <p className="cafe-subtitle">{ut('cafe_sub_choco')}</p>
                <p className="cafe-desc">
                  {ut('cafe_choco_desc').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  <span className="cafe-menu-size-range">M / L</span>
                  <span className="cafe-menu-price-pair">￥580 / ￥680</span>
                  <span className="cafe-price-tax-note">{ut('cafe_tax_note')}</span>
                </p>
              </div>
              <CafePromoMedia
                variant="lg"
                badgeTone="badge-brown"
                productStyle={{ backgroundImage: guestBg('chocolata') }}
                badgeStyle={{ backgroundImage: guestBg('chocolataBadge') }}
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

/** ヒーロー左：レギュラー／ミニ写真（public に置く） */
const FRUIT_SOFT_IMG_REGULAR = retailAssetUrl('guest', GUEST_FRUIT_IMAGES.fruitSoftRegular);
const FRUIT_SOFT_IMG_MINI = retailAssetUrl('guest', GUEST_FRUIT_IMAGES.fruitSoftMini);
const FRUIT_BEAR_LOGO = retailAssetUrl('guest', GUEST_FRUIT_IMAGES.bearLogo);
const guestFruitBg = (key) => retailCssBgUrl('guest', GUEST_FRUIT_IMAGES[key]);

// === FRUIT STUDIO PAGE COMPONENT ===
function FruitStudioMenu({ addToCart }) {
  const { t: ut } = useGuestUiLocale();
  const [opts, setOpts] = useState({
    soft: { type: 'コーン', price: 460 },
    fruit: { size: 'レギュラー', price: 880 }
  });

  const setSoftType = (type) => setOpts((o) => ({ ...o, soft: { ...o.soft, type } }));

  return (
    <main className="main-content fruit-page guest-menu-surface">
      <div className="fruit-wrapper">
        <PageHeaderImage pageKey="fruit" alt={ut('header_fruit')} />

        {/* 下段カードと同じ列幅（左1カラム＝青線イメージのサイズ） */}
        <div className="fruit-top-row">
        <div className="fruit-hero fruit-hero--cafe">
          <div className="fruit-hero-body">
            <div className="cafe-card-top fruit-hero-top">
              <div className="cafe-card-content fruit-hero-text">
                <div className="fruit-ribbon-red">{ut('fruit_ribbon_red')}</div>
                <h2 className="fruit-hero-title">{ut('fruit_hero_title')}</h2>
                <p className="fruit-hero-lead">{ut('fruit_hero_lead')}</p>
                <p className="fruit-hero-desc">
                  {ut('fruit_hero_desc').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <p className="fruit-hero-tagline">{ut('fruit_hero_tagline')}</p>
                <p className="fruit-hero-price-band">
                  <span className="fruit-hero-price-num">660</span>
                  <span className="fruit-hero-price-sep">{ut('fruit_hero_price_between')}</span>
                  <span className="fruit-hero-price-num">880</span>
                  <span className="fruit-hero-price-yen">{ut('fruit_hero_price_suffix')}</span>
                </p>
                <p className="fruit-hero-note">{ut('fruit_hero_note')}</p>
              </div>
              <div className="fruit-card-media fruit-card-media--fruit-hero">
                <div className="cafe-hokkaido-icon fruit-hokkaido-icon--fruit">HOKKAIDO</div>
                <div className="fruit-fruitsoft-visual" aria-hidden="true">
                  <div
                    className="fruit-fruitsoft-regular"
                    style={{ backgroundImage: `url("${FRUIT_SOFT_IMG_REGULAR}")` }}
                  />
                  <div
                    className="fruit-fruitsoft-mini"
                    style={{ backgroundImage: `url("${FRUIT_SOFT_IMG_MINI}")` }}
                  />
                </div>
              </div>
            </div>
            <div className="cafe-actions-row fruit-hero-actions">
              <div className="cafe-toggles fruit-hero-size-toggles">
                <div className="cafe-toggle-group">
                  <button
                    type="button"
                    className={`cafe-size-btn ${opts.fruit.size === 'ミニ' ? 'active' : ''}`}
                    onClick={() => setOpts((o) => ({ ...o, fruit: { size: 'ミニ', price: 660 } }))}
                  >
                    {ut('fruit_size_mini')}
                  </button>
                  <button
                    type="button"
                    className={`cafe-size-btn ${opts.fruit.size === 'レギュラー' ? 'active' : ''}`}
                    onClick={() => setOpts((o) => ({ ...o, fruit: { size: 'レギュラー', price: 880 } }))}
                  >
                    {ut('fruit_size_regular')}
                  </button>
                </div>
              </div>
              <div className="cafe-actions-order">
                <div className="cafe-price-display">
                  {opts.fruit.price}
                  <span>{ut('fruit_yen_suffix')}</span>
                </div>
                <button
                  type="button"
                  className="cafe-order-btn"
                  onClick={() =>
                    addToCart({
                      id: `fr-fruit-${opts.fruit.size}`,
                      name: `本日のソフトクリーム (${opts.fruit.size})`,
                      price: opts.fruit.price,
                    })
                  }
                >
                  {ut('item_add_plus')}
                </button>
              </div>
            </div>
          </div>
        </div>

          <aside className="fruit-hero-side" aria-hidden="true">
            <div className="fruit-hero-bear">
              <img src={FRUIT_BEAR_LOGO} alt="" className="fruit-hero-bear-img" width={280} height={280} decoding="async" />
            </div>
          </aside>
        </div>

        <div className="fruit-grid-2">
          
          <div className="fruit-card fruit-card--gelato">
            <div className="fruit-ribbon-orange">{ut('fruit_ribbon_tokachi')}</div>
            <div className="fruit-badge-round" style={{ left: '225px', top: '30px' }}>TOKACHI<br />MILK</div>
            <div className="cafe-card-top fruit-card-top">
              <div className="cafe-card-content">
                <h3 className="fruit-card-title">{ut('fruit_gelato_title')}</h3>
                <p className="fruit-card-subtitle">{ut('fruit_gelato_sub')}</p>
                <p className="fruit-card-desc">
                  {ut('fruit_gelato_desc').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  {ut('fruit_gelato_price_line').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
              </div>
              <div className="fruit-card-media fruit-card-media--gelato">
                <div className="fruit-gelato-visual" aria-hidden="true">
                  <div className="fruit-gelato-cone" style={{ backgroundImage: guestFruitBg('gelatoCone') }} />
                  <div className="fruit-gelato-cup" style={{ backgroundImage: guestFruitBg('gelatoCup') }} />
                </div>
              </div>
            </div>
            <div className="cafe-actions-row fruit-card-actions">
              <div className="cafe-toggles">
                <div className="cafe-toggle-group">
                  <button
                    type="button"
                    className={`cafe-size-btn ${opts.soft.type === 'コーン' ? 'active' : ''}`}
                    onClick={() => setSoftType('コーン')}
                  >
                    {ut('fruit_soft_cone')}
                  </button>
                  <button
                    type="button"
                    className={`cafe-size-btn ${opts.soft.type === 'カップ' ? 'active' : ''}`}
                    onClick={() => setSoftType('カップ')}
                  >
                    {ut('fruit_soft_cup')}
                  </button>
                </div>
              </div>
              <div className="cafe-actions-order">
                <div className="cafe-price-display">
                  {opts.soft.price}
                  <span>{ut('fruit_yen_suffix')}</span>
                </div>
                <button
                  type="button"
                  className="cafe-order-btn"
                  onClick={() =>
                    addToCart({
                      id: `fr-soft-${opts.soft.type}`,
                      name: `ジェラ生ソフト (${opts.soft.type})`,
                      price: opts.soft.price,
                    })
                  }
                >
                  {ut('item_add_plus')}
                </button>
              </div>
            </div>
          </div>

          <div className="fruit-card fruit-card--affogato">
            <div className="cafe-card-top fruit-card-top">
              <div className="cafe-card-content">
                <h3 className="fruit-card-title">{ut('fruit_affogato_title')}</h3>
                <p className="fruit-card-subtitle">{ut('fruit_affogato_sub')}</p>
                <p className="fruit-card-desc">
                  {ut('fruit_affogato_desc').split('\n').map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">{ut('fruit_affogato_price_line')}</p>
              </div>
              <div className="fruit-card-media fruit-card-media--affogato">
                <div className="fruit-card-img fruit-card-img--affogato" style={{ backgroundImage: guestFruitBg('affogato') }} />
              </div>
            </div>
            <div className="cafe-actions-row fruit-card-actions fruit-card-actions--single">
              <div className="cafe-actions-order">
                <div className="cafe-price-display">
                  680
                  <span>{ut('fruit_yen_suffix')}</span>
                </div>
                <button type="button" className="cafe-order-btn" onClick={() => addToCart({ id: 'fr-affogato', name: 'アフォガード', price: 680 })}>
                  {ut('item_add_plus')}
                </button>
              </div>
            </div>
          </div>

        </div>

        
      </div>
    </main>
  );
}

// === TAKEOUT SWEETS PAGE COMPONENT ===
function TakeoutSweetsMenu({ addToCart }) {
  const { t: ut, locale } = useGuestUiLocale();
  return (
    <TakeoutSweetsMenuView
      addToCart={addToCart}
      variant="guest"
      ut={ut}
      locale={locale}
      PageHeader={PageHeaderImage}
    />
  );
}


// === MAIN APP COMPONENT ===
function App() {
  const [activeTab, setActiveTab] = useState('aburasoba');
  const [showBillPanel, setShowBillPanel] = useState(false);
  const [showSplitCalc, setShowSplitCalc] = useState(false);
  const [splitPeople, setSplitPeople] = useState(2);
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const sidebarNavRef = useRef(null);
  const [sidebarNavScrollHint, setSidebarNavScrollHint] = useState({
    moreAbove: false,
    moreBelow: false,
  });

  const {
    session,
    now,
    nomihodaiActive,
    addGuestOrders,
    requestTableCheckout,
    setSessionTableLabel,
  } = useNomihodaiSession();

  const { t: ut, locale, toggleLocale } = useGuestUiLocale();

  const farewell = session.nomihodaiFarewell;
  /** DB の checkout_requested_at（飲み放題の有無に依存しない）。厨房連携・THANK YOU の単一ソース */
  const guestPostCheckoutFullscreen =
    !!farewell || !!session.checkoutRequestAt;

  const myParty = session.guestPartyByLabel?.[session.tableLabel];
  const needsGuestOnboarding =
    !guestPostCheckoutFullscreen &&
    !!session.tableLabel &&
    !(myParty?.capturedAt > 0);

  /** オーバーレイより上に z-index 固定のカート・上部バナーを隠す（会計フローと重複しない） */
  const hideGuestOrderingChrome = guestPostCheckoutFullscreen || needsGuestOnboarding;

  useEffect(() => {
    if (!guestPostCheckoutFullscreen) return;
    setCart([]);
    setCartDrawerOpen(false);
    setShowBillPanel(false);
  }, [guestPostCheckoutFullscreen]);

  const prevCheckoutRequestAtRef = useRef(session.checkoutRequestAt);
  useEffect(() => {
    const prev = prevCheckoutRequestAtRef.current;
    prevCheckoutRequestAtRef.current = session.checkoutRequestAt;
    const had = prev != null && Number(prev) > 0;
    const gone =
      session.checkoutRequestAt == null || Number(session.checkoutRequestAt) <= 0;
    if (had && gone) {
      setCart([]);
      setCartDrawerOpen(false);
      setShowBillPanel(false);
    }
  }, [session.checkoutRequestAt]);

  useEffect(() => {
    const syncTableFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tbl = params.get('table');
      if (tbl && String(tbl).trim()) {
        setSessionTableLabel(String(tbl).trim());
      }
    };
    syncTableFromUrl();
    window.addEventListener('popstate', syncTableFromUrl);
    const onVis = () => {
      if (document.visibilityState === 'visible') syncTableFromUrl();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('popstate', syncTableFromUrl);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [setSessionTableLabel]);

  useEffect(() => {
    const n = getNomihodaiForTable(session, session.tableLabel);
    setCart((c) => {
      const rest = c.filter((i) => i.id !== NOMIHODAI_PLAN_CART_ID);
      if (!n?.active) return rest;
      const name =
        n.menCount > 0 || n.womenCount > 0
          ? `飲み放題プラン（男性${n.menCount}・女性${n.womenCount}）`
          : `飲み放題プラン（${n.people}名）`;
      return [
        ...rest,
        {
          id: NOMIHODAI_PLAN_CART_ID,
          name,
          price: n.billTotal,
          qty: 1,
          nomihodaiLocked: true,
        },
      ];
    });
  }, [session.nomihodaiByLabel, session.tableLabel]);

  useLayoutEffect(() => {
    const el = sidebarNavRef.current;
    if (!el) return undefined;

    const updateHint = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const eps = 3;
      if (scrollHeight <= clientHeight + eps) {
        setSidebarNavScrollHint({ moreAbove: false, moreBelow: false });
        return;
      }
      setSidebarNavScrollHint({
        moreAbove: scrollTop > eps,
        moreBelow: scrollTop + clientHeight < scrollHeight - eps,
      });
    };

    updateHint();
    el.addEventListener('scroll', updateHint, { passive: true });
    const ro = new ResizeObserver(updateHint);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateHint);
      ro.disconnect();
    };
  }, []);

  const updateQty = (id, delta) => {
    setCart((cart) =>
      cart
        .map((item) => {
          if (item.id !== id) return item;
          if (item.nomihodaiLocked) return item;
          const newQty = Math.max(0, item.qty + delta);
          return { ...item, qty: newQty };
        })
        .filter((item) => item.qty > 0)
    );
  };

  const addToCart = (product) => {
    setCart((cart) => {
      const existing = cart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.nomihodaiLocked) return cart;
        return cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...cart, { ...product, qty: 1 }];
    });
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const alcoholChargeExtra = getAlcoholTableCharge(session, session.tableLabel).totalYen;
  const billGrandTotal = total + alcoholChargeExtra;
  const safeSplitPeople = Math.max(1, Number(splitPeople) || 1);
  const splitAmount = Math.ceil(billGrandTotal / safeSplitPeople);
  const orderableItems = cart.filter((item) => !item.nomihodaiLocked && item.qty > 0);
  const cartQtySum = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  const nhForGuestBill = getNomihodaiForTable(session, session.tableLabel);

  const renderCartItems = () =>
    cart.length === 0 ? (
      <p className="cart-drawer-empty">{ut('cart_empty')}</p>
    ) : (
      cart.map((item) => (
        <div className="cart-item" key={item.id}>
          <div className="cart-item-info">
            <div className="cart-item-name">
              {item.aburasobaDetail ? (
                locale === 'en' ? (
                  <div className="cart-item-name-main">
                    {guestCartLineDisplay(item, locale, ut, nhForGuestBill)}
                  </div>
                ) : (
                  <>
                    <div className="cart-item-name-main">
                      {item.aburasobaDetail.bowlTitle}（{item.aburasobaDetail.size}）
                    </div>
                    {item.aburasobaDetail.toppings?.length > 0 ? (
                      <div className="cart-item-toppings">
                        {item.aburasobaDetail.toppings.map((t) => (
                          <div key={t.id} className="cart-item-topping-line">
                            ・{t.name}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )
              ) : (
                guestCartLineDisplay(item, locale, ut, nhForGuestBill)
              )}
            </div>
            <div className="cart-item-price serif">
              ￥{item.price.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
            </div>
            <div className="qty-control">
              <button
                type="button"
                className="qty-btn"
                disabled={item.nomihodaiLocked}
                onClick={() => updateQty(item.id, -1)}
              >
                −
              </button>
              <span>{item.qty}</span>
              <button
                type="button"
                className="qty-btn"
                disabled={item.nomihodaiLocked}
                onClick={() => updateQty(item.id, 1)}
              >
                +
              </button>
            </div>
          </div>
          <button
            type="button"
            className="cart-item-remove"
            disabled={item.nomihodaiLocked}
            onClick={() => updateQty(item.id, -99)}
          >
            ✕
          </button>
        </div>
      ))
    );

  const buildKitchenOrderName = (item) => {
    if (!item?.aburasobaDetail) return item.name;
    const toppings = item.aburasobaDetail.toppings || [];
    const base = `${item.aburasobaDetail.bowlTitle}（${item.aburasobaDetail.size}）`;
    if (!toppings.length) return base;
    const lines = toppings.map((t) => `・${t.name}`);
    return [base, ...lines].join('\n');
  };

  const showNotice = (message, tone = 'ok') => {
    setNotice({ message, tone, key: Date.now() });
  };

  useEffect(() => {
    if (!notice) return undefined;
    const noticeTimer = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(noticeTimer);
  }, [notice]);

  useEffect(() => {
    if (!cartDrawerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setCartDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartDrawerOpen]);

  const onConfirmOrder = async () => {
    if (orderableItems.length === 0) {
      showNotice(ut('notice_no_items'), 'warn');
      return;
    }
    const stock = assertTakeoutSweetsOrderItems(orderableItems);
    if (!stock.ok) {
      showNotice(
        ut('notice_stock_short', { id: stock.id, have: stock.have, need: stock.need }),
        'warn',
      );
      return;
    }
    const rows = orderableItems.flatMap((item) =>
      Array.from({ length: item.qty }, () => ({
        itemId: item.id,
        itemName: buildKitchenOrderName(item),
        itemPrice: Number(item.price) || 0,
        isNomihodai: false,
      }))
    );
    const sent = await addGuestOrders(rows);
    if (sent && sent.ok === false) {
      const hint = sent.guestHint || sent.errorMessage || '';
      showNotice(hint ? `${ut('notice_order_fail_prefix')}${hint}` : ut('notice_order_fail_prefix'), 'warn');
      return;
    }
    applyTakeoutSweetsSales(orderableItems.map((i) => ({ id: i.id, qty: i.qty })));
    setCart((c) => c.filter((i) => i.nomihodaiLocked));
    setCartDrawerOpen(false);
    const qtyTotal = orderableItems.reduce((sum, item) => sum + item.qty, 0);
    showNotice(ut('notice_order_ok', { count: qtyTotal }), 'ok');
  };

  const onRequestCheckout = async () => {
    const tableOk = String(session.tableLabel ?? '').trim();
    if (!tableOk) {
      showNotice(ut('notice_checkout_no_table'), 'warn');
      return;
    }
    const { error } = await requestTableCheckout();
    if (error) {
      const msg = typeof error?.message === 'string' ? error.message : String(error?.message ?? '');
      const detail =
        msg === 'NO_TABLE'
          ? ut('notice_checkout_no_table')
          : msg
            ? ` (${msg})`
            : ut('notice_checkout_fail_suffix');
      showNotice(`${ut('notice_checkout_fail_prefix')}${detail}`, 'warn');
      return;
    }
    showNotice(ut('notice_checkout_ok'), 'ok');
  };

  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissingScreen />;
  }

  return (
    <div className={`app-container${needsGuestOnboarding ? ' app-container--onboarding' : ''}`}>
      {needsGuestOnboarding ? <GuestOnboardingGate /> : null}
      <SupabaseConnectionBanner variant="guest" />
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-area">
          <h1 className="serif">しあわせ
            <br />
            研究所
            <br />
            yum</h1>
        
        </div>
        <div
          className={[
            'sidebar-nav-scroll',
            sidebarNavScrollHint.moreAbove && 'sidebar-nav-scroll--more-above',
            sidebarNavScrollHint.moreBelow && 'sidebar-nav-scroll--more-below',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <nav ref={sidebarNavRef} className="nav-menu" aria-label={ut('nav_label')}>
            <div className="nav-menu-section" aria-label={ut('nav_food')}>
              <div className={`nav-item ${activeTab === 'aburasoba' ? 'active' : ''}`} onClick={() => setActiveTab('aburasoba')}>
                {ut('nav_aburasoba')}
              </div>
              <div className={`nav-item ${activeTab === 'sidedish' ? 'active' : ''}`} onClick={() => setActiveTab('sidedish')}>
                {ut('nav_sidedish')}
              </div>
              <div className={`nav-item ${activeTab === 'pizza' ? 'active' : ''}`} onClick={() => setActiveTab('pizza')}>
                PIZZA
              </div>
            </div>
            <hr className="nav-menu-rule" role="presentation" />
            <div className="nav-menu-section" aria-label={ut('nav_drinks')}>
              <div
                className={`nav-item nav-item--plan ${activeTab === 'nomihoudai' ? 'active' : ''}`}
                onClick={() => setActiveTab('nomihoudai')}
              >
                {ut('nav_nomihodai')}
              </div>
              <div className={`nav-item ${activeTab === 'drink' ? 'active' : ''}`} onClick={() => setActiveTab('drink')}>
                {ut('nav_drink')}
              </div>
            </div>
            <hr className="nav-menu-rule" role="presentation" />
            <div className="nav-menu-section" aria-label={ut('nav_dessert')}>
              <div className={`nav-item ${activeTab === 'fruit' ? 'active' : ''}`} onClick={() => setActiveTab('fruit')}>
                {ut('nav_fruit')}
              </div>
              <div className={`nav-item ${activeTab === 'cafe' ? 'active' : ''}`} onClick={() => setActiveTab('cafe')}>
                {ut('nav_cafe')}
              </div>
              <div className={`nav-item nav-item--takeout ${activeTab === 'takeout' ? 'active' : ''}`} onClick={() => setActiveTab('takeout')}>
                {ut('nav_takeout').split('\n').map((line, i, arr) => (
                  <Fragment key={i}>
                    {line}
                    {i < arr.length - 1 ? <br /> : null}
                  </Fragment>
                ))}
              </div>
            </div>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button type="button" className="action-btn action-btn--checkout" onClick={onRequestCheckout}>
            {ut('btn_checkout')}
          </button>
          <button type="button" className="action-btn" onClick={() => setShowBillPanel(true)}>{ut('btn_current_bill')}</button>
          <button
            type="button"
            className="action-btn action-btn--utility"
            onClick={toggleLocale}
            title={locale === 'ja' ? ut('lang_action_en') : ut('lang_action_ja')}
          >
            🌐 {locale === 'ja' ? ut('lang_action_en') : ut('lang_action_ja')}
          </button>
        </div>
      </aside>

      {/* MAIN WRAPPER（会計後オーバーレイはこの列のみ。サイドバーは常に操作可） */}
      <div
        className={[
          'main-wrapper',
          guestPostCheckoutFullscreen ? 'main-wrapper--guest-checkout-overlay' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          backgroundColor:
            activeTab === 'sidedish'
              ? '#FAF8F5'
              : activeTab === 'pizza' || activeTab === 'drink'
                ? '#F8F4E6'
                : activeTab === 'nomihoudai'
                  ? '#F2E8DC'
                  : '#FDF9F1',
        }}
      >
        {!hideGuestOrderingChrome ? <NomihodaiGuestBanner /> : null}
        <div className="main-wrapper__guest-phase">
          {guestPostCheckoutFullscreen ? (
            <div
              className="guest-main-fullscreen"
              role="dialog"
              aria-modal="true"
              aria-label={farewell ? ut('guest_aria_checkout_farewell') : ut('guest_aria_checkout_thanks')}
            >
              {farewell ? (
                <NomihodaiGuestFarewellFlow farewell={farewell} now={now} />
              ) : (
                <NomihodaiGuestCheckoutThankYou freeFlowActive={!!nomihodaiActive} />
              )}
            </div>
          ) : null}
          <div className="content-wrapper">
          
          {/* DYNAMIC MAIN CONTENT */}
          {activeTab === 'aburasoba' && <AburasobaMenu addToCart={addToCart} />}
          {activeTab === 'sidedish' && <SideDishMenu addToCart={addToCart} />}
          {activeTab === 'pizza' && <PizzaMenu addToCart={addToCart} />}
          {activeTab === 'drink' && (
            <DrinkMenu addToCart={addToCart} />
          )}
          {activeTab === 'nomihoudai' && (
              <NomihodaiTabRouter onOpenNomihodaiBill={() => setShowBillPanel(true)} />
            )}
          {activeTab === 'cafe' && <CafeMenu addToCart={addToCart} />}
          {activeTab === 'fruit' && <FruitStudioMenu addToCart={addToCart} />}
          {activeTab === 'takeout' && <TakeoutSweetsMenu addToCart={addToCart} />}

          {/* 飲み放題タブでは画面内「注文カート」を使うため、共通カートタブは出さない */}
          {/* 会計オーバーレイ中はカート UI を出さない（fixed の z-index がオーバーレイより上になるため） */}
          {activeTab !== 'nomihoudai' && !hideGuestOrderingChrome && (
            <>
              <div
                className={`cart-drawer-backdrop${cartDrawerOpen ? ' cart-drawer-backdrop--open' : ''}`}
                aria-hidden={!cartDrawerOpen}
                onClick={() => setCartDrawerOpen(false)}
              />

              <aside
                className={`cart-drawer-panel${cartDrawerOpen ? ' cart-drawer-panel--open' : ''}`}
                aria-hidden={!cartDrawerOpen}
                id="cart-drawer"
                aria-label={ut('cart_title')}
              >
                <div className="cart-header cart-drawer-panel__head">
                  <span className="cart-title">{ut('cart_title')}</span>
                  <div className="cart-drawer-panel__actions">
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={() => setCart((c) => c.filter((i) => i.nomihodaiLocked))}
                    >
                      {ut('cart_clear')}
                    </button>
                    <button
                      type="button"
                      className="cart-drawer-panel__close"
                      aria-label={ut('cart_close')}
                      onClick={() => setCartDrawerOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="cart-items">{renderCartItems()}</div>
                <div className="cart-footer">
                  <div className="total-area">
                    <span className="total-label">{ut('cart_total')}</span>
                    <div className="cart-total-col">
                      <span className="total-price serif">￥{total.toLocaleString()}</span>
                      <span className="total-tax">{ut('cart_tax')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="checkout-btn"
                    disabled={orderableItems.length === 0}
                    onClick={onConfirmOrder}
                  >
                    {ut('cart_confirm')}
                  </button>
                </div>
              </aside>

              <button
                type="button"
                className={`cart-drawer-edge${cartDrawerOpen ? ' cart-drawer-edge--hidden' : ''}`}
                aria-expanded={cartDrawerOpen}
                aria-controls="cart-drawer"
                onClick={() => setCartDrawerOpen((o) => !o)}
              >
                <span className="cart-drawer-edge__icon" aria-hidden="true">
                  🛒
                </span>
                <span className="cart-drawer-edge__label">{ut('cart_edge')}</span>
                {cartQtySum > 0 ? (
                  <span className="cart-drawer-edge__badge">{cartQtySum > 99 ? '99+' : cartQtySum}</span>
                ) : null}
              </button>
            </>
          )}
          </div>
        </div>

        {showBillPanel && (
          <div className="bill-overlay" onClick={() => setShowBillPanel(false)}>
            <div className="bill-panel" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="checkout-btn bill-checkout-btn" onClick={onRequestCheckout}>
                {ut('bill_checkout')}
              </button>
              <div className="bill-panel-title">{ut('bill_title')}</div>
              {alcoholChargeExtra > 0 ? (
                <p className="bill-panel-alcohol" role="note">
                  {locale === 'en'
                    ? formatAlcoholChargeLineForGuest(session, session.tableLabel, locale)
                    : getAlcoholTableCharge(session, session.tableLabel).lineName}
                  <span className="bill-panel-alcohol-yen"> ＋￥{alcoholChargeExtra.toLocaleString()}</span>
                </p>
              ) : null}
              <div className="bill-total">
                ￥{billGrandTotal.toLocaleString()} <span>{ut('tax_included_short')}</span>
              </div>
              <button className="split-btn" onClick={() => setShowSplitCalc(prev => !prev)}>{ut('bill_split')}</button>
              {showSplitCalc && (
                <div className="bill-split-area">
                  <div className="split-input-row">
                    <span>{ut('bill_split_people')}</span>
                    <button className="split-step-btn" onClick={() => setSplitPeople(prev => Math.max(1, (Number(prev) || 1) - 1))}>−</button>
                    <input
                      className="split-people-input"
                      type="number"
                      min="1"
                      value={splitPeople}
                      onChange={(e) => setSplitPeople(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <span>{ut('bill_people_unit')}</span>
                    <button className="split-step-btn" onClick={() => setSplitPeople(prev => (Number(prev) || 1) + 1)}>＋</button>
                  </div>
                  <div className="split-result">{ut('bill_split_per')} ￥{splitAmount.toLocaleString()}</div>
                </div>
              )}
              <button className="bill-close-btn" onClick={() => setShowBillPanel(false)}>{ut('bill_close')}</button>
            </div>
          </div>
        )}

        {/* BOTTOM BAR */}
        <footer className="bottom-bar">
          <span className="bottom-bar__brand">しあわせ研究所yum</span>
          <span className="bottom-bar__note">{ut('bottom_alcohol')}</span>
        </footer>
      </div>
      {notice ? (
        <div className={`guest-notice guest-notice--${notice.tone}`} role="status" aria-live="polite" key={notice.key}>
          {notice.message}
        </div>
      ) : null}

      <GuestPromoScreensaver
        paused={
          guestPostCheckoutFullscreen ||
          showBillPanel ||
          cartDrawerOpen ||
          orderableItems.length > 0
        }
      />
    </div>
  );
}

export default App;
