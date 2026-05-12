/**
 * 厨房スタッフ用：客席 App.jsx のソフトクリーム／カフェドリンク／テイクアウト画面の複製。
 * 客席コードは変更せず、ここだけメンテで客席と揃える運用を想定。
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appendDailyLedgerEntry } from './dailyLedger.js';
import {
  mergeInventoryMap,
  enrichTakeoutItem,
  sortTakeoutItemsByStock,
  fetchSweetsInventoryFromEnv,
  SWEETS_SOLD_COUNTS_STORAGE_KEY,
  inventoryMapAfterSales,
  syncTakeoutInventoryDisplaySnapshot,
  assertTakeoutSweetsCart,
  applyTakeoutSweetsSales,
} from './takeoutSweetsInventory.js';

const RetailStaffCartContext = createContext(null);

function useRetailStaffCart() {
  const v = useContext(RetailStaffCartContext);
  if (!v) throw new Error('useRetailStaffCart: Provider missing');
  return v;
}

const ASSET_BASE = import.meta.env.BASE_URL;

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
    <main className="main-content kitchen-staff-retail-menu" style={{ background: '#FAF6ED' }}>
      <div className="cafe-wrapper">
        <div className="cafe-grid-2">
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

const FRUIT_SOFT_IMG_REGULAR = assetUrl('名称未設定-1_0000_regyura-furusofu.png');
const FRUIT_SOFT_IMG_MINI = assetUrl('名称未設定-2_0000_mini_furusofu.png');
const FRUIT_BEAR_LOGO = assetUrl('fruit-bear-logo.png');

export function KitchenStaffFruitStudioMenu() {
  const { addToCart } = useRetailStaffCart();
  const [opts, setOpts] = useState({
    soft: { type: 'コーン', price: 460 },
    fruit: { size: 'レギュラー', price: 880 },
  });

  const setSoftType = (type) => setOpts((o) => ({ ...o, soft: { ...o.soft, type } }));

  return (
    <main className="main-content fruit-page kitchen-staff-retail-menu">
      <div className="fruit-wrapper">
        <PageHeaderImage pageKey="fruit" alt="ソフトクリーム" />

        <div className="kitchen-staff-fruit-carousel" role="region" aria-label="ソフトクリーム（横スクロール）">
          <div className="fruit-top-row">
          <div className="fruit-hero fruit-hero--cafe">
            <div className="fruit-hero-body">
              <div className="cafe-card-top fruit-hero-top">
                <div className="cafe-card-content fruit-hero-text">
                  <h2 className="fruit-hero-title">本日のソフトクリーム</h2>
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
                        name: `本日のソフトクリーム (${opts.fruit.size})`,
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
            <div className="fruit-badge-round" style={{ left: '225px', top: '30px' }}>
              TOKACHI
              <br />
              MILK
            </div>
            <div className="cafe-card-top fruit-card-top">
              <div className="cafe-card-content">
                <h3 className="fruit-card-title">ジェラ生ソフト</h3>
                <p className="fruit-card-subtitle">Gelato Soft</p>
                <p className="fruit-card-desc">
                  北海道産十勝ミルクを原料とした
                  <br />
                  ふわもこ自家製ソフトクリーム
                </p>
                <p className="cafe-price-info cafe-price-info-spaced">
                  カップ or コーン
                  <br />
                  460yen
                </p>
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
                <p className="fruit-card-desc">
                  ジェラ生ソフトに
                  <br />
                  ほろ苦いエスプレッソを注ぎます
                </p>
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
      </div>
    </main>
  );
}

export function KitchenStaffTakeoutSweetsMenu() {
  const { addToCart } = useRetailStaffCart();
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

  const scones = [
    { id: 'ts-sc-plain', name: '発酵バタースコーン', price: 360, image: assetUrl('hakko-bata-.png') },
    { id: 'ts-sc-choco', name: 'ココアスコーン', price: 360, image: assetUrl('kokoa.png') },
    { id: 'ts-sc-matcha', name: '抹茶スコーン', price: 360, image: assetUrl('mattya.png') },
    { id: 'ts-sc-caramel', name: 'キャラメルスコーン', price: 360, image: assetUrl('kyarameru.png') },
    { id: 'ts-sc-maple', name: 'メープルスコーン', price: 360, image: assetUrl('meipuru.png') },
    { id: 'ts-sc-namacream', name: '生クリームスコーン', price: 360, image: assetUrl('namakuri-mu.png') },
  ];

  const rittireCookies = [
    { id: 'ts-rt-1', name: 'リトルレアクッキー\n（1枚）', price: 380, image: assetUrl('rittireakukki-.png') },
    { id: 'ts-rt-4', name: 'リトルレアクッキー\n（4枚）', price: 1400, image: assetUrl('rittireakukki-4mai.png') },
  ];

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
              人気
              <br />
              No.{item.rank}
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
          <div className="ts-section-title">
            <span>♡</span> フルーツサンド <span>♡</span>
          </div>
          <div className="ts-grid">{furusanSorted.map((item) => renderCard(item, true))}</div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{ background: '#E6E6FA' }}>
            <span>♡</span> クッキーサンド <span>♡</span>
          </div>
          <div className="ts-grid">{kukkiSorted.map((item) => renderCard(item))}</div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{ background: '#FFE4B5' }}>
            <span>♡</span> スコーン <span>♡</span>
          </div>
          <div className="ts-grid">{sconesSorted.map((item) => renderCard(item))}</div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{ background: '#E0FFFF' }}>
            <span>♡</span> リッチレアクッキー <span>♡</span>
          </div>
          <div className="ts-grid">{rittireSorted.map((item) => renderCard(item))}</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button type="button" className="ts-view-all">
            すべての商品を見る ∨
          </button>
        </div>
      </div>
    </main>
  );
}

/** 日計・売上カレンダーに載せる区分（卓番ではない） */
const LEDGER_TAKEOUT_GUEST_LABEL = 'テイクアウト客';

/**
 * @param {object} props
 * @param {() => void} [props.onRetailCheckoutComplete] 会計記録後に呼ぶ（例：お会計済みタブへ）
 */
export function KitchenStaffRetailHub({ onRetailCheckoutComplete }) {
  const [sub, setSub] = useState('fruit');
  /** @type {Array<{ key: string, id: string, name: string, price: number, qty: number }>} */
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState(null);

  useEffect(() => {
    setCheckoutMsg(null);
  }, [cart]);

  const addToCart = useCallback((item) => {
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
  }, []);

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
    });
    applyTakeoutSweetsSales(cart.map((r) => ({ id: r.id, qty: r.qty })));
    setCart([]);
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
          <div className="kitchen-retail-hub__top">
            <div className="kitchen-retail-hub__toolbar">
              <div className="kitchen-retail-hub__toolbar-row">
                <span className="kitchen-retail-hub__label">会計の登録区分</span>
                <strong className="kitchen-retail-hub__current kitchen-retail-hub__current--pill">{LEDGER_TAKEOUT_GUEST_LABEL}</strong>
              </div>
            </div>

            <div className="kitchen-retail-hub__tabs" role="tablist" aria-label="ソフトクリーム・カフェドリンク・テイクアウトスイーツ">
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
            </div>
          </div>

          <div className="kitchen-retail-hub__body">
            <div className="kitchen-retail-hub__scroll">
              {sub === 'fruit' ? <KitchenStaffFruitStudioMenu /> : null}
              {sub === 'cafe' ? <KitchenStaffCafeMenu /> : null}
              {sub === 'takeout' ? <KitchenStaffTakeoutSweetsMenu /> : null}
            </div>

            <aside className="kitchen-retail-cart" aria-label="テイクアウト用カート">
              <div className="kitchen-retail-cart__head">
                <span className="kitchen-retail-cart__title">カート</span>
                <strong className="kitchen-retail-cart__sum">￥{subtotal.toLocaleString()}</strong>
              </div>
              {cart.length === 0 ? (
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
                  disabled={cart.length === 0}
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
