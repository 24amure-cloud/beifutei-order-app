import React, { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import NomihodaiGuestBanner from './NomihodaiGuestBanner.jsx';
import { NomihodaiGuestCheckoutThankYou, NomihodaiGuestFarewellFlow } from './NomihodaiGuestCheckoutScreens.jsx';
import { NomihodaiTabRouter } from './NomihodaiGuestFlow.jsx';
import DrinkHeroImage from './DrinkHeroImage.jsx';
import { getDrinkSectionHeroCandidates } from './data/drinkHeroImages.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getNomihodaiForTable } from './nomihodaiSession.js';
import { useMenuMaster } from './MenuMasterContext.jsx';
import { isSupabaseConfigured } from './supabaseClient.js';
import SupabaseConfigMissingScreen from './SupabaseConfigMissingScreen.jsx';

const NOMIHODAI_PLAN_CART_ID = 'nomihodai-plan-charge';
import {
  mergeInventoryMap,
  enrichTakeoutItem,
  sortTakeoutItemsByStock,
  fetchSweetsInventoryFromEnv,
  SWEETS_SOLD_COUNTS_STORAGE_KEY,
  inventoryMapAfterSales,
  syncTakeoutInventoryDisplaySnapshot,
  assertTakeoutSweetsOrderItems,
  applyTakeoutSweetsSales,
} from './takeoutSweetsInventory.js';

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

/** ページ先頭ヘッダー PNG（書き出し実名を先頭 → 旧短名はフォールバック） */
const PAGE_HEADER_FILES = {
  aburasoba: ['aburasobahedda-.png'],
  sidedish: ['名称未設定-5_0004_saidomenyu-hedda-.png', 'saidomenyu-hedda-.png'],
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

const ABURASOBA_PRICES = {
  normal: { 小: 980, 並: 1130, 大: 1330 },
  spicy: { 小: 980, 並: 1180, 大: 1380 },
  negi: { 小: 1030, 並: 1230, 大: 1430 },
};

const ABURASOBA_BOWL_META = {
  normal: { key: 'normal', title: '米風亭 油そば' },
  spicy: { key: 'spicy', title: '辛々担々 油そば' },
  negi: { key: 'negi', title: 'ネギ盛り 油そば' },
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

  const [opts, setOpts] = useState({
    normal: { size: '並', price: 1130 },
    spicy: { size: '並', price: 1180 },
    negi: { size: '並', price: 1230 },
  });

  /** 'normal' | 'spicy' | 'negi' | null */
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
        <PageHeaderImage pageKey="aburasoba" alt="米風亭 油そば" />
        <div className="abu-main-with-toppings">
          <div className="abu-main-hero-row">
            <p className="abu-flow-hint">
              「追加」からサイズとトッピングをまとめて選べます。下のトッピング一覧からはトッピングのみ追加できます。
            </p>
            {/* Hero Section */}
            <section className="abu-hero">
              <div className="abu-hero-left">
                <p className="subtitle">昭和の味を受け継ぐ、<br /><span className="red">元祖</span> 油そば。</p>
                <h2 className="title">米風亭<br />油そば</h2>
                <p className="desc">— シンプル、だけど奥深い。—</p>
              </div>

              <div className="abu-hero-center">
                <div className="abu-badge-no1">人気<br />No.1</div>
                <div className="abu-hero-img-area">
                  <div
                    className="abu-hero-img"
                    style={{
                      backgroundImage: cssBgUrl('油そば坦々-メニュー完_0008_レイヤー-1.png'),
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  />
                </div>
              </div>

              <div className="abu-hero-right">
                <div className="r-title">札幌米風亭 油そば</div>
                <div className="r-desc">特製ダレがもちもちの麺に絡む、<br />飽きのこない一杯。<br />毎日でも食べたくなる一杯</div>

                <div className="abu-price-list">
                  {['小', '並', '大'].map((s) => (
                    <div className="abu-price-item" key={s} onClick={() => updateOpt('normal', s)} style={{ cursor: 'pointer' }}>
                      <div className="abu-size-circle" style={{ background: opts.normal.size === s ? '#A91E1E' : '#333' }}>{s}</div>
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
                    追加
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="abu-main-variant-row">
            {/* Recommended Section */}
            <div className="abu-section-header">
              <div className="abu-section-title">別仕立て</div>
              <div className="abu-section-line"></div>
            </div>

            <div className="abu-rec-grid">
            {/* Spicy Aburasoba */}
            <div className="abu-rec-card">
              <div className="abu-rec-info">
                <div className="abu-rec-title">辛々担々 油そば</div>
                <div className="abu-rec-desc">肉みその旨味広がる<br/>やみつき坦々油そば<br/>花椒はお好みで</div>
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
                          <div className="abu-size-circle abu-size-circle--rec">{s}</div>
                          <div className="abu-rec-size-price">￥{prices.spicy[s].toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="abu-btn-full" onClick={() => openFlow('spicy')}>
                      追加
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Negi Aburasoba */}
            <div className="abu-rec-card">
              <div className="abu-rec-info">
                <div className="abu-rec-title">チーズ 油そば</div>
                <div className="abu-rec-desc">チーズ好き必見<br/>たっぷりチーズを炙って提供</div>
                <div className="abu-rec-bottom">
                  <div className="abu-rec-img" style={{ backgroundImage: cssBgUrl('abu-cheese-aburasoba.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                  <div className="abu-rec-price-area">
                    <div className="abu-rec-price-col">
                      {['小', '並', '大'].map((s) => (
                        <div
                          key={s}
                          className={`abu-rec-size-row${opts.negi.size === s ? ' abu-rec-size-row--active' : ''}`}
                          onClick={() => updateOpt('negi', s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              updateOpt('negi', s);
                            }
                          }}
                        >
                          <div className="abu-size-circle abu-size-circle--rec">{s}</div>
                          <div className="abu-rec-size-price">￥{prices.negi[s].toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="abu-btn-full" onClick={() => openFlow('negi')}>
                      追加
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
              <div className="abu-section-title">トッピングで自分好みに</div>
              <div className="abu-toppings-note">※価格はすべて税込みです。</div>
            </div>

            <div className="abu-toppings-list">
              {toppings.map((t) => (
                <div
                  className="abu-topping-item"
                  key={t.id}
                  onClick={() =>
                    addToCart({
                      id: t.id,
                      name: t.name.replace('\n', ''),
                      price: t.price,
                    })
                  }
                >
                  <div
                    className="abu-topping-img"
                    style={{
                      backgroundImage: `url("${t.image || `https://via.placeholder.com/100x100/transparent/333?text=${t.text}`}")`,
                    }}
                  />
                  <div className="abu-topping-name">
                    {t.name.split('\n').map((line, i) => (
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
              <button type="button" className="abu-flow-close" aria-label="閉じる" onClick={closeFlow}>
                ×
              </button>

              {flowStep === 1 && (
                <>
                  <h2 id="abu-flow-title" className="abu-flow-title">
                    サイズを選んでください
                  </h2>
                  <p className="abu-flow-bowl-name">{ABURASOBA_BOWL_META[flowBowl].title}</p>
                  <div className="abu-flow-size-grid">
                    {['小', '並', '大'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`abu-flow-size-btn ${flowSize === s ? 'active' : ''}`}
                        onClick={() => setFlowSize(s)}
                      >
                        <span className="abu-flow-size-label">{s}</span>
                        <span className="abu-flow-size-price">￥{prices[flowBowl][s].toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="abu-flow-primary" onClick={() => setFlowStep(2)}>
                    次へ（トッピング）
                  </button>
                </>
              )}

              {flowStep === 2 && (
                <>
                  <h2 id="abu-flow-title" className="abu-flow-title">
                    トッピングはいかがですか？
                  </h2>
                  <p className="abu-flow-note">複数選べます（タップで追加・解除）※税込</p>
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
                          {t.name.split('\n').map((line, i, arr) => (
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
                      {ABURASOBA_BOWL_META[flowBowl].title}（{flowSize}） … ￥{flowBasePrice.toLocaleString()}
                    </span>
                    {flowToppingsExtra > 0 && (
                      <span>＋トッピング … ￥{flowToppingsExtra.toLocaleString()}</span>
                    )}
                    <strong className="abu-flow-summary-total">計 ￥{flowTotal.toLocaleString()}（税込）</strong>
                  </div>
                  <div className="abu-flow-actions">
                    <button type="button" className="abu-flow-secondary" onClick={() => setFlowStep(1)}>
                      戻る
                    </button>
                    <button type="button" className="abu-flow-primary" onClick={confirmAddToCart}>
                      カートに追加
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

/** 付け合わせ・おすすめドリンク（`store-order/public` の gurasubi-ru / haibo-ru / remonsawa- を同期） */
const SD_DRINK_GLASS_BEER = assetUrl('gurasubi-ru.webp');
const SD_DRINK_HIGHBALL = assetUrl('haibo-ru.png');
const SD_DRINK_LEMON_SOUR = assetUrl('remonsawa-.jpg');

// === SIDE DISH PAGE COMPONENT ===
function SideDishMenu({ addToCart }) {
  return (
    <main className="main-content" style={{ background: '#FAF8F5' }}>
      <div className="side-dish-wrapper">
        <PageHeaderImage pageKey="sidedish" alt="サイドメニュー" />
        <div className="sd-top-grid">
          <div className="sd-feature-card">
            <div className="sd-feature-body">
              <div className="sd-badge">RECOMMEND</div>
              <div className="sd-title">
                生BIG
                <br />
                フランク3種盛り
              </div>
              <p className="sd-desc">お酒に合う“間違いない”一皿</p>
              <div className="sd-price">
                980<span>円</span> <small>(税込)</small>
              </div>
              <button
                type="button"
                className="add-btn sd-add-btn sd-add-btn--hero"
                onClick={() => addToCart({ id: 'sd-frank', name: '生BIGフランク3種盛り', price: 980 })}
              >
                カートに追加
              </button>
            </div>
            <div
              className="sd-image-large"
              style={{
                backgroundImage: cssBgUrl('名称未設定-2_0000_xo-se-ji.png'),
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
          </div>

          <aside className="sd-recommend-drink" aria-label="おすすめのお酒">
            <div className="sd-drink-kicker">DRINK</div>
            <div className="sd-drink-title">おすすめのお酒</div>
            <div className="sd-drink-grid">
              <div className="sd-drink-item">
                <div className="sd-drink-img">
                  <img src={SD_DRINK_GLASS_BEER} alt="" className="sd-drink-photo" decoding="async" />
                </div>
                <div className="sd-drink-name">グラス生ビール（一番搾り）</div>
                <div className="sd-drink-price">600円</div>
                <button
                  type="button"
                  className="add-btn sd-add-btn"
                  onClick={() => addToCart({ id: 'sd-drink-beer', name: 'グラス生ビール（一番搾り）', price: 600 })}
                >
                  追加
                </button>
              </div>
              <div className="sd-drink-item">
                <div className="sd-drink-img">
                  <img src={SD_DRINK_HIGHBALL} alt="" className="sd-drink-photo" decoding="async" />
                </div>
                <div className="sd-drink-name">ハイボール</div>
                <div className="sd-drink-price">600円</div>
                <button
                  type="button"
                  className="add-btn sd-add-btn"
                  onClick={() => addToCart({ id: 'sd-drink-highball', name: 'ハイボール', price: 600 })}
                >
                  追加
                </button>
              </div>
              <div className="sd-drink-item">
                <div className="sd-drink-img">
                  <img src={SD_DRINK_LEMON_SOUR} alt="" className="sd-drink-photo" decoding="async" />
                </div>
                <div className="sd-drink-name">レモンサワー</div>
                <div className="sd-drink-price">600円</div>
                <button
                  type="button"
                  className="add-btn sd-add-btn"
                  onClick={() => addToCart({ id: 'sd-drink-lemon-sour', name: 'レモンサワー', price: 600 })}
                >
                  追加
                </button>
              </div>
            </div>
          </aside>
        </div>

        <div className="sd-row-toriaezu">
          <div className="sd-col-card sd-col-card--toriaezu" aria-label="とりあえず">
            <div className="sd-section-title">とりあえず</div>
            <div className="sd-toriaezu-inner">
              <div className="sd-toriaezu-lines">
                <div className="sd-list-row">
                  <div className="sd-list-line">
                    <span className="sd-list-name">自家製ピクルス盛り</span>
                    <span className="sd-list-leader" aria-hidden="true" />
                    <span className="sd-list-price">560円</span>
                  </div>
                  <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-pickles', name: '自家製ピクルス盛り', price: 560 })}>追加</button>
                </div>
                <div className="sd-list-row">
                  <div className="sd-list-line">
                    <span className="sd-list-name">塩ゆで枝豆</span>
                    <span className="sd-list-leader" aria-hidden="true" />
                    <span className="sd-list-price">450円</span>
                  </div>
                  <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-edamame', name: '塩ゆで枝豆', price: 450 })}>追加</button>
                </div>
              </div>
              <div className="sd-images-row sd-images-row--toriaezu">
                <div className="sd-image-medium" style={{ backgroundImage: cssBgUrl('名称未設定-2_0007_pikurusu.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                <div className="sd-image-medium" style={{ backgroundImage: cssBgUrl('名称未設定-2_0006_edamame.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="sd-grid-2">
          <div className="sd-col-card">
            <div className="sd-section-title">みんな大好き</div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">赤ウインナー</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">580円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-wiener', name: '赤ウインナー', price: 580 })}>追加</button>
            </div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">ポテト</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">580円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-potato', name: 'シューストポテト', price: 580 })}>追加</button>
            </div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">チキンナゲット (5ヶ)</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">580円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-nugget', name: 'チキンナゲット', price: 580 })}>追加</button>
            </div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">ひと口ハッシュドポテト (5ヶ)</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">560円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-hash', name: 'ひと口ハッシュドポテト', price: 560 })}>追加</button>
            </div>
            <div className="sd-images-row sd-images-row--foot">
              <div className="sd-image-round" style={{ backgroundImage: cssBgUrl('名称未設定-2_0001_potato.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              <div className="sd-image-round" style={{ backgroundImage: cssBgUrl('名称未設定-2_0003_nagetto.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              <div className="sd-image-round" style={{ backgroundImage: cssBgUrl('名称未設定-2_0002_hassyupotato.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
            </div>
          </div>

          <div className="sd-col-card">
            <div className="sd-section-title">呑ませる一皿</div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">自家製牛タンジャーキー</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">860円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-jerky', name: '牛タンジャーキー', price: 860 })}>追加</button>
            </div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">Yum特性から揚げ</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">790円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-karaage', name: 'Yum特性から揚げ', price: 790 })}>追加</button>
            </div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">うずら味玉（5粒）</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">450円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-uzura', name: 'うずら味玉（5粒）', price: 450 })}>追加</button>
            </div>
            <div className="sd-list-row">
              <div className="sd-list-line">
                <span className="sd-list-name">おつまみチャーシュー</span>
                <span className="sd-list-leader" aria-hidden="true" />
                <span className="sd-list-price">600円</span>
              </div>
              <button type="button" className="add-btn sd-add-btn" onClick={() => addToCart({ id: 'sd-snack-chashu', name: 'おつまみチャーシュー', price: 600 })}>追加</button>
            </div>
            <div className="sd-images-row sd-images-row--foot">
              <div className="sd-image-medium" style={{ backgroundImage: cssBgUrl('名称未設定-2_0005_jya-ki-.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              <div className="sd-image-medium" style={{ backgroundImage: cssBgUrl('名称未設定-1_0004_karaage.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              <div className="sd-image-medium" style={{ backgroundImage: cssBgUrl('名称未設定-1_0002_uZURA.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              <div className="sd-image-medium" style={{ backgroundImage: cssBgUrl('名称未設定-1_0000_tya-syu-.png'), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
            </div>
          </div>
        </div>
        <p className="sd-page-foot">※表示価格はすべて税込です。</p>
      </div>
    </main>
  );
}

function DrinkMenu({ addToCart }) {
  const { drinkSections } = useMenuMaster();
  const { nomihodaiActive } = useNomihodaiSession();

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
              飲み放題適用中は、ご注文は<strong>「飲み放題」タブ</strong>からお選びください（この一覧は閲覧のみです）。
            </p>
          ) : null}
          <p className="drink-page__sub">お席料21時前500円21時以降800円頂戴いたします。混雑時は2時間を目途にお席をお譲り頂く場合がございます。</p>

          <div className="drink-page__grid">
            {drinkSections.map((sec) => (
              <div key={sec.id} className="drink-page-cat">
                <div className="drink-page-cat__head">
                  <span className="drink-page-cat__en">{sec.titleEn}</span>
                  <span className="drink-page-cat__ja">{sec.titleJa}</span>
                </div>
                <DrinkHeroImage
                  candidates={getDrinkSectionHeroCandidates(sec.id)}
                  className="drink-page-cat__hero"
                  imgClassName="drink-page-cat__hero-img"
                />
                {sec.hint ? <p className="drink-page-cat__hint">{sec.hint}</p> : null}
                <ul className={`drink-page-list${sec.twoCols ? ' drink-page-list--2col' : ''}`}>
                  {sec.items.map((it) => (
                    <li key={it.id} className="drink-page-row">
                      <span className="drink-page-row__name">{it.name}</span>
                      <span className="drink-page-row__price">
                        {it.price != null ? `￥${it.price.toLocaleString()}` : 'ASK'}
                      </span>
                      {it.price != null ? (
                        <button
                          type="button"
                          className="drink-page-row__add"
                          disabled={nomihodaiActive}
                          onClick={() => addToCart({ id: it.id, name: it.name, price: it.price })}
                          title={nomihodaiActive ? '飲み放題タブからご注文ください' : undefined}
                        >
                          追加
                        </button>
                      ) : (
                        <span className="drink-page-row__na" title="店頭でご確認ください">
                          —
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="drink-page__footer">※価格はすべて税込です。</p>
        </section>
      </div>
    </main>
  );
}

// === PIZZA PAGE COMPONENT ===
function PizzaMenu({ addToCart }) {
  const pizzaHeroes = [
    {
      id: 'pz-margherita',
      nameJa: 'マルゲリータ',
      nameEn: 'Margherita',
      desc: '【トマトソース・モッツァレラ・バジル】',
      price: 1380,
      image: assetUrl('名称未設定-3_0004_maruge.png'),
      cardBg: 'cafe-card-bg-beige',
    },
    {
      id: 'pz-genovese',
      nameJa: 'ジェノベーゼ',
      nameEn: 'Genovese',
      desc: '【バジルソース・トマト・ベーコン】',
      price: 1480,
      image: assetUrl('名称未設定-3_0000_jenobeze.png'),
      cardBg: 'cafe-card-bg-blue',
    },
    {
      id: 'pz-bismark',
      nameJa: 'ビスマルク',
      nameEn: 'Bismark',
      desc: '【トマトソース・ベーコン・卵】',
      price: 1380,
      image: assetUrl('名称未設定-3_0002_bisumaruku.png'),
      cardBg: 'cafe-card-bg-pink',
    },
    {
      id: 'pz-quattro',
      nameJa: 'クワトロフォルマッジ',
      nameEn: 'Quattro formaggi',
      desc: '【4種のチーズ】',
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
              <span className="coming-soon-message__note">※6月下旬より週末のみ</span>
            </div>
          </div>

          {/* カフェドリンクと同じ 2×2（cafe-grid-2）で 4 ヒーロー */}
          <div className="cafe-grid-2 pizza-heroes-grid">
          {pizzaHeroes.map((p) => (
            <div key={p.id} className={`cafe-card pizza-hero-corner ${p.cardBg}`}>
              <div className="cafe-card-top pizza-hero-top">
                <div className="cafe-card-content">
                  <h3 className="cafe-title">{p.nameJa}</h3>
                  <p className="cafe-subtitle">{p.nameEn}</p>
                  <p className="cafe-desc">{p.desc}</p>
                  <p className="cafe-price-info cafe-price-info-spaced">￥{p.price.toLocaleString()}</p>
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
                  <button type="button" className="cafe-order-btn" onClick={() => addToCart({ id: p.id, name: p.nameJa, price: p.price })}>
                    ＋ 追加
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px', color: '#666' }}>
            ※ 全品テイクアウト可（容器代100円）
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

// === CAFE PAGE COMPONENT ===
function CafeMenu({ addToCart }) {
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
    <main className="main-content" style={{ background: '#FAF6ED' }}>
      <div className="cafe-wrapper">
        <div className="cafe-grid-2">
          {/* coffee (Americano) */}
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
                  backgroundImage:
                    opts.americano.temp === 'hot'
                      ? cssBgUrl('名称未設定-1_0002_hotcoffe.png')
                      : cssBgUrl('名称未設定-1_0004_icecoffe.png'),
                }}
                badgeStyle={{ backgroundImage: cssBgUrl('名称未設定-1_0005_coffesetumei.png') }}
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
                productStyle={{ backgroundImage: cssBgUrl('名称未設定-1_0003_Icelate.png') }}
                badgeStyle={{ backgroundImage: cssBgUrl('名称未設定-1_0008_latesetumei.png') }}
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
                productStyle={{ backgroundImage: cssBgUrl('名称未設定-1_0001_ichigomiruku.png') }}
                badgeStyle={{ backgroundImage: cssBgUrl('名称未設定-1_0006_ichigosetumei.png') }}
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
                productStyle={{ backgroundImage: cssBgUrl('名称未設定-1_0000_chocolata.png') }}
                badgeStyle={{ backgroundImage: cssBgUrl('名称未設定-1_0007_chocosetumei.png') }}
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
const FRUIT_SOFT_IMG_REGULAR = assetUrl('名称未設定-1_0000_regyura-furusofu.png');
const FRUIT_SOFT_IMG_MINI = assetUrl('名称未設定-2_0000_mini_furusofu.png');
const FRUIT_BEAR_LOGO = assetUrl('fruit-bear-logo.png');

// === FRUIT STUDIO PAGE COMPONENT ===
function FruitStudioMenu({ addToCart }) {
  const [opts, setOpts] = useState({
    soft: { type: 'コーン', price: 460 },
    fruit: { size: 'レギュラー', price: 880 }
  });

  const setSoftType = (type) => setOpts((o) => ({ ...o, soft: { ...o.soft, type } }));

  return (
    <main className="main-content fruit-page">
      <div className="fruit-wrapper">
        <PageHeaderImage pageKey="fruit" alt="フルーツ・ソフト" />

        {/* 下段カードと同じ列幅（左1カラム＝青線イメージのサイズ） */}
        <div className="fruit-top-row">
        <div className="fruit-hero fruit-hero--cafe">
          <div className="fruit-hero-body">
            <div className="cafe-card-top fruit-hero-top">
              <div className="cafe-card-content fruit-hero-text">
                <div className="fruit-ribbon-red">新鮮 フルーツを贅沢に！</div>
                <h2 className="fruit-hero-title">本日のフルーツソフト</h2>
                <p className="fruit-hero-lead">Fresh Fruit Soft</p>
                <p className="fruit-hero-desc">
                  新鮮フルーツの上に
                  <br />
                  ジェラ生ソフトを乗せました
                </p>
                <p className="fruit-hero-tagline">ミニ or レギュラー</p>
                <p className="fruit-hero-price-band">
                  <span className="fruit-hero-price-num">660</span>
                  <span className="fruit-hero-price-sep">yen / </span>
                  <span className="fruit-hero-price-num">880</span>
                  <span className="fruit-hero-price-yen">yen</span>
                </p>
                <p className="fruit-hero-note">ご提供できるフルーツは日替わりです。</p>
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
                    ミニ
                  </button>
                  <button
                    type="button"
                    className={`cafe-size-btn ${opts.fruit.size === 'レギュラー' ? 'active' : ''}`}
                    onClick={() => setOpts((o) => ({ ...o, fruit: { size: 'レギュラー', price: 880 } }))}
                  >
                    レギュラー
                  </button>
                </div>
              </div>
              <div className="cafe-actions-order">
                <div className="cafe-price-display">
                  {opts.fruit.price}
                  <span>yen〜</span>
                </div>
                <button
                  type="button"
                  className="cafe-order-btn"
                  onClick={() =>
                    addToCart({
                      id: `fr-fruit-${opts.fruit.size}`,
                      name: `本日のフルーツソフト (${opts.fruit.size})`,
                      price: opts.fruit.price,
                    })
                  }
                >
                  ＋ 追加
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
            <div className="fruit-ribbon-orange">北海道十勝ミルク使用</div>
            <div className="fruit-badge-round" style={{ left: '225px', top: '30px' }}>TOKACHI<br />MILK</div>
            <div className="cafe-card-top fruit-card-top">
              <div className="cafe-card-content">
                <h3 className="fruit-card-title">ジェラ生ソフト</h3>
                <p className="fruit-card-subtitle">Gelato Soft</p>
                <p className="fruit-card-desc">北海道産十勝ミルクを原料とした<br />ふわもこ自家製ソフトクリーム</p>
                <p className="cafe-price-info cafe-price-info-spaced">カップ or コーン<br />460yen</p>
              </div>
              <div className="fruit-card-media fruit-card-media--gelato">
                <div className="fruit-gelato-visual" aria-hidden="true">
                  <div className="fruit-gelato-cone" style={{ backgroundImage: cssBgUrl('名称未設定-1_0001_jeranamako-nn.png') }} />
                  <div className="fruit-gelato-cup" style={{ backgroundImage: cssBgUrl('名称未設定-1_0003_jeranamakappu.png') }} />
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
                    コーン
                  </button>
                  <button
                    type="button"
                    className={`cafe-size-btn ${opts.soft.type === 'カップ' ? 'active' : ''}`}
                    onClick={() => setSoftType('カップ')}
                  >
                    カップ
                  </button>
                </div>
              </div>
              <div className="cafe-actions-order">
                <div className="cafe-price-display">
                  {opts.soft.price}
                  <span>yen〜</span>
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
                  ＋ 追加
                </button>
              </div>
            </div>
          </div>

          <div className="fruit-card fruit-card--affogato">
            <div className="cafe-card-top fruit-card-top">
              <div className="cafe-card-content">
                <h3 className="fruit-card-title">アフォガード</h3>
                <p className="fruit-card-subtitle">Affogato</p>
                <p className="fruit-card-desc">ジェラ生ソフトに<br />ほろ苦いエスプレッソを注ぎます</p>
                <p className="cafe-price-info cafe-price-info-spaced">680yen</p>
              </div>
              <div className="fruit-card-media fruit-card-media--affogato">
                <div className="fruit-card-img fruit-card-img--affogato" style={{ backgroundImage: cssBgUrl('名称未設定-2_0001_afoga-do.png') }} />
              </div>
            </div>
            <div className="cafe-actions-row fruit-card-actions fruit-card-actions--single">
              <div className="cafe-actions-order">
                <div className="cafe-price-display">
                  680
                  <span>yen〜</span>
                </div>
                <button type="button" className="cafe-order-btn" onClick={() => addToCart({ id: 'fr-affogato', name: 'アフォガード', price: 680 })}>
                  ＋ 追加
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
  /** furusan-*.png（フルーツサンド）— ファイル名末尾が種類 */
  const furusanItems = [
    { id: 'ts-fr-itigo', name: 'いちご', price: 580, rank: 1, color: '#F48FB1', image: assetUrl('furusan-itigo.png') },
    { id: 'ts-fr-furu-tumix', name: 'フルーツMIX', price: 630, rank: 2, color: '#81D4FA', image: assetUrl('furusan-furu-tumix.png') },
    { id: 'ts-fr-golden-pine', name: 'ゴールドパイン', price: 560, rank: 3, color: '#FFB74D', image: assetUrl('furusan-go-rudennpainn.png') },
    { id: 'ts-fr-itigokiui', name: 'キウイいちご', price: 490, image: assetUrl('furusan-itigokiui.png') },
    { id: 'ts-fr-itigopain', name: 'いちごパイン', price: 580, image: assetUrl('furusan-itigopain.png') },
    { id: 'ts-fr-ichigobanana', name: 'いちごバナナ', price: 680, image: assetUrl('furusan-tigobanana.png') },
    { id: 'ts-fr-chocobanana', name: 'バナナチョコ', price: 480, image: assetUrl('furusan-tyokobanana.png') },
    { id: 'ts-fr-orange', name: 'オレンジ', price: 520, image: assetUrl('furusan-orange.png') },
    { id: 'ts-fr-kiui-mix', name: 'キウイMIX', price: 480, image: assetUrl('furusan-kiui-mix.png') },
  ];

  /** kukki-*.png（クッキーサンド） */
  const kukkiCookieSand = [
    { id: 'ts-kk-hani', name: 'ハニーポッド\nクッキーサンド', price: 460, image: assetUrl('kukki-hani-poddo.png') },
    { id: 'ts-kk-matcha', name: '抹茶\nクッキーサンド', price: 460, image: assetUrl('kukki-mattya.png') },
    { id: 'ts-kk-hasukappu', name: '苫小牧ハスカップチョコ\nクッキーサンド', price: 480, image: assetUrl('kukki-tomakomai-hasukappu-choco.png') },
    { id: 'ts-kk-nuts-choco', name: 'ナッツチョコ\nクッキーサンド', price: 460, image: assetUrl('kukki-nattutyoko.png') },
    { id: 'ts-kk-pine', name: 'パイン\nクッキーサンド', price: 460, image: assetUrl('kukki-pain.png') },
    { id: 'ts-kk-peach', name: 'ピーチ\nクッキーサンド', price: 460, image: assetUrl('kukki-pi-ti.png') },
    { id: 'ts-kk-vanilla', name: 'ロイヤルバニラ\nクッキーサンド', price: 420, image: assetUrl('kukki-roiyarubanira.png') },
    { id: 'ts-kk-straw', name: 'ストロベリー\nクッキーサンド', price: 460, image: assetUrl('kukki-sutoroberi-.png') },
  ];

  /** スコーン — ファイル名末尾が種類（store-order と同じ命名） */
  const scones = [
    { id: 'ts-sc-plain', name: '発酵バタースコーン', price: 360, image: assetUrl('hakko-bata-.png') },
    { id: 'ts-sc-choco', name: 'ココアスコーン', price: 360, image: assetUrl('kokoa.png') },
    { id: 'ts-sc-matcha', name: '抹茶スコーン', price: 360, image: assetUrl('mattya.png') },
    { id: 'ts-sc-caramel', name: 'キャラメルスコーン', price: 360, image: assetUrl('kyarameru.png') },
    { id: 'ts-sc-maple', name: 'メープルスコーン', price: 360, image: assetUrl('meipuru.png') },
    { id: 'ts-sc-namacream', name: '生クリームスコーン', price: 360, image: assetUrl('namakuri-mu.png') },
  ];

  /** rittireakukki（リトルレアクッキー）— 1枚／4枚 */
  const rittireCookies = [
    { id: 'ts-rt-1', name: 'リトルレアクッキー\n（1枚）', price: 380, image: assetUrl('rittireakukki-.png') },
    { id: 'ts-rt-4', name: 'リトルレアクッキー\n（4枚）', price: 1400, image: assetUrl('rittireakukki-4mai.png') },
  ];

  /** マスタ在庫マップ（SWEETS_INVENTORY_MASTER＋API）。高在庫が先頭・品切れは末尾 */
  const [inventoryMap, setInventoryMap] = useState(() => mergeInventoryMap());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchSweetsInventoryFromEnv();
      if (!cancelled && remote) setInventoryMap(mergeInventoryMap(remote));
    })();
    const poll = setInterval(async () => {
      const remote = await fetchSweetsInventoryFromEnv();
      if (!cancelled && remote) setInventoryMap(mergeInventoryMap(remote));
    }, 120000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  const [soldTick, setSoldTick] = useState(0);
  useEffect(() => {
    const bump = () => setSoldTick((x) => x + 1);
    window.addEventListener('beifutei-sweets-sold-updated', bump);
    const onStorage = (e) => {
      if (e.key === SWEETS_SOLD_COUNTS_STORAGE_KEY || e.key === null) bump();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-sweets-sold-updated', bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    syncTakeoutInventoryDisplaySnapshot(inventoryMap);
  }, [inventoryMap]);

  const displayInventoryMap = useMemo(
    () => inventoryMapAfterSales(inventoryMap),
    [inventoryMap, soldTick],
  );

  const furusanSorted = sortTakeoutItemsByStock(furusanItems.map((i) => enrichTakeoutItem(i, displayInventoryMap)));
  const kukkiSorted = sortTakeoutItemsByStock(kukkiCookieSand.map((i) => enrichTakeoutItem(i, displayInventoryMap)));
  const sconesSorted = sortTakeoutItemsByStock(scones.map((i) => enrichTakeoutItem(i, displayInventoryMap)));
  const rittireSorted = sortTakeoutItemsByStock(rittireCookies.map((i) => enrichTakeoutItem(i, displayInventoryMap)));

  const renderCard = (item, isRanked = false) => {
    const soldOut = (item.stock ?? 0) <= 0;
    return (
      <div className={`ts-card${soldOut ? ' ts-card--soldout' : ''}`} key={item.id}>
        {soldOut && <div className="ts-soldout-badge">品切れ</div>}
        {isRanked && item.rank != null && !soldOut && (
          <div className={item.rank === 1 ? 'ts-rank-stack ts-rank-stack--no1' : 'ts-rank-stack'}>
            {item.rank === 1 ? <span className="ts-rank-zabuton" aria-hidden="true" /> : null}
            <div className="ts-rank-badge" style={{ color: item.color }}>
              人気<br />No.{item.rank}
            </div>
          </div>
        )}
        <div
          className="ts-img"
          style={
            item.image
              ? { backgroundImage: `url("${item.image}")` }
              : { backgroundImage: `url("https://via.placeholder.com/150x150/transparent/333?text=${encodeURIComponent(item.id)}")` }
          }
        />
        <div className="ts-name">{item.name.split('\n').map((line, i) => <div key={i}>{line}</div>)}</div>
        <div className="ts-card-footer">
          <div className="ts-price">￥{item.price}</div>
          <button
            type="button"
            className="ts-add-btn"
            disabled={soldOut}
            title={soldOut ? '品切れのため注文できません' : undefined}
            onClick={() => addToCart({ id: item.id, name: item.name.replace(/\n/g, ''), price: item.price })}
          >
            ＋ カートに追加
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="main-content" style={{ background: 'linear-gradient(135deg, #FFE4E1 0%, #FFF0F5 50%, #F0F8FF 100%)' }}>
      <div className="ts-wrapper">
        <PageHeaderImage pageKey="takeout" alt="takeout北海道スイーツ" />
        <p className="ts-header-note">※油そば・フードメニュー・お酒のご利用の方は食中後のデザートとしてご利用いただけます</p>

        <div className="ts-section">
          <div className="ts-section-title"><span>♡</span> フルーツサンド <span>♡</span></div>
          <div className="ts-grid">
            {furusanSorted.map(item => renderCard(item, true))}
          </div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{ background: '#E6E6FA' }}><span>♡</span> クッキーサンド <span>♡</span></div>
          <div className="ts-grid">
            {kukkiSorted.map(item => renderCard(item))}
          </div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{ background: '#FFE4B5' }}><span>♡</span> スコーン <span>♡</span></div>
          <div className="ts-grid">
            {sconesSorted.map(item => renderCard(item))}
          </div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{ background: '#E0FFFF' }}><span>♡</span> リッチレアクッキー <span>♡</span></div>
          <div className="ts-grid">
            {rittireSorted.map(item => renderCard(item))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button type="button" className="ts-view-all">すべての商品を見る ∨</button>
        </div>
      </div>
    </main>
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

  const farewell = session.nomihodaiFarewell;
  /** DB の checkout_requested_at（飲み放題の有無に依存しない）。厨房連携・THANK YOU の単一ソース */
  const guestPostCheckoutFullscreen =
    !!farewell || !!session.checkoutRequestAt;

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
  const safeSplitPeople = Math.max(1, Number(splitPeople) || 1);
  const splitAmount = Math.ceil(total / safeSplitPeople);
  const orderableItems = cart.filter((item) => !item.nomihodaiLocked && item.qty > 0);
  const cartQtySum = cart.reduce((sum, item) => sum + (item.qty || 0), 0);

  const renderCartItems = () =>
    cart.length === 0 ? (
      <p className="cart-drawer-empty">カートに商品がありません。</p>
    ) : (
      cart.map((item) => (
        <div className="cart-item" key={item.id}>
          <div className="cart-item-info">
            <div className="cart-item-name">
              {item.aburasobaDetail ? (
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
              ) : (
                item.name
              )}
            </div>
            <div className="cart-item-price serif">￥{item.price.toLocaleString()}</div>
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
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
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
      showNotice('注文する商品がありません。', 'warn');
      return;
    }
    const stock = assertTakeoutSweetsOrderItems(orderableItems);
    if (!stock.ok) {
      showNotice(
        `テイクアウトスイーツの在庫が足りません（${stock.id}: 残り ${stock.have}、ご希望 ${stock.need}）。カートを調整してください。`,
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
      showNotice(
        `注文をサーバーに送れませんでした。Supabase の接続・RLS（beifutei_orders の insert）を確認してください。${sent.errorMessage ? ` (${sent.errorMessage})` : ''}`,
        'warn'
      );
      return;
    }
    applyTakeoutSweetsSales(orderableItems.map((i) => ({ id: i.id, qty: i.qty })));
    setCart((c) => c.filter((i) => i.nomihodaiLocked));
    setCartDrawerOpen(false);
    const qtyTotal = orderableItems.reduce((sum, item) => sum + item.qty, 0);
    showNotice(`ご注文を受け付けました（${qtyTotal}点）。`, 'ok');
  };

  const onRequestCheckout = async () => {
    if (total <= 0) {
      showNotice('現在のお会計は0円です。', 'warn');
      return;
    }
    const { error } = await requestTableCheckout();
    if (error) {
      showNotice(
        `お会計依頼を送信できませんでした。${error.message ? `（${error.message}）` : '通信を確認してください。'}`,
        'warn'
      );
      return;
    }
    showNotice('お会計のご依頼を受け付けました。スタッフが伺います。', 'ok');
  };

  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissingScreen />;
  }

  return (
    <div className="app-container">
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
          <nav ref={sidebarNavRef} className="nav-menu" aria-label="メニューカテゴリ">
            <div className="nav-menu-section" aria-label="フード">
              <div className={`nav-item ${activeTab === 'aburasoba' ? 'active' : ''}`} onClick={() => setActiveTab('aburasoba')}>
                油そば
              </div>
              <div className={`nav-item ${activeTab === 'pizza' ? 'active' : ''}`} onClick={() => setActiveTab('pizza')}>
                ピッツァ
              </div>
              <div className={`nav-item ${activeTab === 'sidedish' ? 'active' : ''}`} onClick={() => setActiveTab('sidedish')}>
                サイドメニュー
              </div>
            </div>
            <hr className="nav-menu-rule" role="presentation" />
            <div className="nav-menu-section" aria-label="お飲み物">
              <div
                className={`nav-item nav-item--plan ${activeTab === 'nomihoudai' ? 'active' : ''}`}
                onClick={() => setActiveTab('nomihoudai')}
              >
                飲み放題
              </div>
              <div className={`nav-item ${activeTab === 'drink' ? 'active' : ''}`} onClick={() => setActiveTab('drink')}>
                ドリンク
              </div>
              <div className={`nav-item ${activeTab === 'cafe' ? 'active' : ''}`} onClick={() => setActiveTab('cafe')}>
                カフェドリンク
              </div>
            </div>
            <hr className="nav-menu-rule" role="presentation" />
            <div className="nav-menu-section" aria-label="デザート・お持ち帰り">
              <div className={`nav-item ${activeTab === 'fruit' ? 'active' : ''}`} onClick={() => setActiveTab('fruit')}>
                フルーツ・ソフト
              </div>
              <div className={`nav-item nav-item--takeout ${activeTab === 'takeout' ? 'active' : ''}`} onClick={() => setActiveTab('takeout')}>
                テイクアウト
                <br />
                スイーツ
              </div>
            </div>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button type="button" className="action-btn action-btn--checkout" onClick={onRequestCheckout}>
            お会計する
          </button>
          <button type="button" className="action-btn" onClick={() => setShowBillPanel(true)}>現在のお会計</button>
          <button type="button" className="action-btn action-btn--utility">🌐 日本語 ⌄</button>
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
        <NomihodaiGuestBanner />
        <div className="main-wrapper__guest-phase">
          {guestPostCheckoutFullscreen ? (
            <div
              className="guest-main-fullscreen"
              role="dialog"
              aria-modal="true"
              aria-label={farewell ? '会計完了のご案内' : 'お会計を承りました'}
            >
              {farewell ? (
                <NomihodaiGuestFarewellFlow farewell={farewell} now={now} />
              ) : (
                <NomihodaiGuestCheckoutThankYou />
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
              <NomihodaiTabRouter addToCart={addToCart} onOpenNomihodaiBill={() => setShowBillPanel(true)} />
            )}
          {activeTab === 'cafe' && <CafeMenu addToCart={addToCart} />}
          {activeTab === 'fruit' && <FruitStudioMenu addToCart={addToCart} />}
          {activeTab === 'takeout' && <TakeoutSweetsMenu addToCart={addToCart} />}

          {/* 飲み放題適用中はカート UI を隠す。カートは右スライド（メイン商品エリアの幅は据え置き） */}
          {!nomihodaiActive && (
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
                aria-label="ご注文内容"
              >
                <div className="cart-header cart-drawer-panel__head">
                  <span className="cart-title">ご注文内容</span>
                  <div className="cart-drawer-panel__actions">
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={() => setCart((c) => c.filter((i) => i.nomihodaiLocked))}
                    >
                      🗑️ すべて削除
                    </button>
                    <button
                      type="button"
                      className="cart-drawer-panel__close"
                      aria-label="カートを閉じる"
                      onClick={() => setCartDrawerOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="cart-items">{renderCartItems()}</div>
                <div className="cart-footer">
                  <div className="total-area">
                    <span className="total-label">合計</span>
                    <div className="cart-total-col">
                      <span className="total-price serif">￥{total.toLocaleString()}</span>
                      <span className="total-tax">（税込）</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="checkout-btn"
                    disabled={orderableItems.length === 0}
                    onClick={onConfirmOrder}
                  >
                    注文を確定する ＞
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
                <span className="cart-drawer-edge__label">カート</span>
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
                お会計する
              </button>
              <div className="bill-panel-title">現在のお会計</div>
              <div className="bill-total">￥{total.toLocaleString()} <span>(税込)</span></div>
              <button className="split-btn" onClick={() => setShowSplitCalc(prev => !prev)}>人数割り勘</button>
              {showSplitCalc && (
                <div className="bill-split-area">
                  <div className="split-input-row">
                    <span>人数</span>
                    <button className="split-step-btn" onClick={() => setSplitPeople(prev => Math.max(1, (Number(prev) || 1) - 1))}>−</button>
                    <input
                      className="split-people-input"
                      type="number"
                      min="1"
                      value={splitPeople}
                      onChange={(e) => setSplitPeople(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <span>人</span>
                    <button className="split-step-btn" onClick={() => setSplitPeople(prev => (Number(prev) || 1) + 1)}>＋</button>
                  </div>
                  <div className="split-result">1人あたり ￥{splitAmount.toLocaleString()}</div>
                </div>
              )}
              <button className="bill-close-btn" onClick={() => setShowBillPanel(false)}>閉じる</button>
            </div>
          </div>
        )}

        {/* BOTTOM BAR */}
        <footer className="bottom-bar">
          <div>しあわせ研究所yum</div>
          <div>🛎️ ご不明な点はスタッフまでお声がけください</div>
          <div>お酒ご注文のお客様はお席料17時～21時500円・21時以降800円頂戴しております。</div>
        </footer>
      </div>
      {notice ? (
        <div className={`guest-notice guest-notice--${notice.tone}`} role="status" aria-live="polite" key={notice.key}>
          {notice.message}
        </div>
      ) : null}
    </div>
  );
}

export default App;
