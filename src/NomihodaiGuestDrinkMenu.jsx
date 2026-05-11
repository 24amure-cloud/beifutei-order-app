import React, { useMemo, useState } from 'react';
import { NOMIHODAI_EXTRA_SHOTS } from './NomihoudaiPage.jsx';
import DrinkHeroImage from './DrinkHeroImage.jsx';
import {
  getNomihodaiHeroCandidatesForCategory,
  resolveNomihodaiVisualSlot,
} from './data/drinkHeroImages.js';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import {
  NOMIHODAI_SECTION_KEYS,
  NOMIHODAI_SECTION_EMPTY_HINTS,
  partitionNomihodaiCatalog,
} from './nomihodaiMenuCorners.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getNomihodaiForTable } from './nomihodaiSession.js';
import { playNomihodaiSoftEndSound } from './nomihodaiSoftEndSound.js';

function fmtHM(ms) {
  try {
    return new Date(ms).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function fmtOrderClock(ms) {
  try {
    return new Date(ms ?? Date.now()).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

/** セッション残りを MM:SS（1時間超は H:MM:SS） */
function fmtSessionRemain(totalMs) {
  const ms = Math.max(0, totalMs);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ClockIcon() {
  return (
    <svg className="nh-luxe-bar__glyph" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M12 8v5l3 1.5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="nh-luxe-bar__glyph nh-luxe-bar__glyph--bell" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3a5 5 0 0 0-5 5v3.5c0 .8-.3 1.6-.8 2.2L5 15h14l-1.2-1.3c-.5-.6-.8-1.4-.8-2.2V8a5 5 0 0 0-5-5zM10 18a2 2 0 0 0 4 0"
      />
    </svg>
  );
}

function WineGlassIcon({ className = '' }) {
  return (
    <svg className={`nh-ff-glass-ico ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 3h8l-1 11a4 4 0 0 1-3.42 3.95L12 22l-.58-4.05A4 4 0 0 1 9 14L8 3zm1.12 2l.75 8.25c.06.66.58 1.19 1.24 1.25L12 18.2l.89-3.7c.66-.06 1.18-.59 1.24-1.25L14.88 5H9.12z"
      />
    </svg>
  );
}

export default function NomihodaiGuestDrinkMenu({ onOpenBill, addToCart }) {
  const { nomihodaiCatalog } = useNomihodaiCatalog();
  const {
    addNomihodaiOrder,
    canOrderMoreNomihodai,
    pendingNomihodaiCount,
    session,
    now,
    nomihodaiPlan,
    requestTableCheckout,
  } = useNomihodaiSession();
  /** キッチン送信前のドラフト（この中だけ削除・変更可） */
  const [draftCart, setDraftCart] = useState([]);
  const [checkoutError, setCheckoutError] = useState(null);

  const n = getNomihodaiForTable(session, session.tableLabel);
  const people = n?.people ?? 1;
  const men = n?.menCount ?? 0;
  const women = n?.womenCount ?? 0;

  const progressPct = useMemo(
    () => Math.min(100, (pendingNomihodaiCount / Math.max(1, people)) * 100),
    [pendingNomihodaiCount, people]
  );

  const nhOrders = useMemo(() => {
    const lbl = String(session.tableLabel || '3');
    return session.orders
      .filter((o) => o.isNomihodai && String(o.tableLabel ?? '3') === lbl)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [session.orders, session.tableLabel]);

  const sectionBuckets = useMemo(() => partitionNomihodaiCatalog(nomihodaiCatalog), [nomihodaiCatalog]);

  const freeKitchenSlots = Math.max(0, people - pendingNomihodaiCount);

  const addDraftLine = (itemId, itemName) => {
    setDraftCart((prev) => [
      ...prev,
      {
        draftId: `d-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        itemId,
        itemName,
      },
    ]);
  };

  const removeDraftLine = (draftId) => {
    setDraftCart((prev) => prev.filter((row) => row.draftId !== draftId));
  };

  const sendDraftToKitchen = () => {
    if (draftCart.length === 0 || freeKitchenSlots === 0) return;
    const nSend = Math.min(draftCart.length, freeKitchenSlots);
    const batch = draftCart.slice(0, nSend);
    batch.forEach((row) => addNomihodaiOrder({ itemId: row.itemId, itemName: row.itemName }));
    setDraftCart((prev) => prev.slice(nSend));
  };

  if (!n?.active) return null;

  const renderCategoryCard = (cat) => {
    const slot = resolveNomihodaiVisualSlot(cat);
    return (
      <article key={cat.id} className={`nh-active__card nh-active__card--ff nh-active__card--slot-${slot}`}>
        <div className="nh-active__card-ribbon">
          <span className="nh-active__card-ribbon-en">{cat.titleEn}</span>
          <span className="nh-active__card-ribbon-ja">{cat.titleJa}</span>
        </div>
        <div className="nh-active__card-inner">
          <div className="nh-active__card-list-wrap">
            <ul className="nh-active__card-list">
              {cat.items.map((it) => (
                <li key={it.id} className="nh-active__card-row">
                  <span>{it.name}</span>
                  <button type="button" className="nh-active__order-btn" onClick={() => addDraftLine(it.id, it.name)}>
                    注文
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <DrinkHeroImage
            candidates={getNomihodaiHeroCandidatesForCategory(cat)}
            className="nh-active__card-photo"
            imgClassName="nh-active__card-photo-img"
          />
        </div>
      </article>
    );
  };

  const remainingMs = Math.max(0, n.endMs - now);
  const sessionClock = fmtSessionRemain(remainingMs);
  const nextChargeMin = Math.max(0, Math.ceil(remainingMs / 60000));

  return (
    <main className="main-content nh-active nh-active--ff">
      <div className="nh-active__shell">
        <header className="nh-luxe-bar" aria-label="セッションステータス">
          <div className="nh-luxe-bar__segment">
            <ClockIcon />
            <span className="nh-luxe-bar__en">SESSION TIME</span>
            <span className="nh-luxe-bar__hero nh-luxe-bar__hero--time">{sessionClock}</span>
            <span className="nh-luxe-bar__ja">ご利用残り時間</span>
          </div>
          <div className="nh-luxe-bar__rule" aria-hidden="true" />
          <div className="nh-luxe-bar__segment nh-luxe-bar__segment--next-charge">
            <BellIcon />
            <span className="nh-luxe-bar__en">NEXT CHARGE</span>
            <p className="nh-luxe-bar__hero nh-luxe-bar__hero--charge">
              <strong>{nextChargeMin}</strong>
              <span className="nh-luxe-bar__min">MIN</span>
            </p>
            <span className="nh-luxe-bar__ja">次回自動延長まで</span>
          </div>
          <div className="nh-luxe-bar__rule" aria-hidden="true" />
          <div className="nh-luxe-bar__segment nh-luxe-bar__segment--extend nh-luxe-bar__segment--extend-info">
            <span className="nh-luxe-bar__en">AUTO EXTEND</span>
            <span className="nh-luxe-bar__mid nh-luxe-bar__mid--extend-title">自動延長システム</span>
            <div className="nh-luxe-bar__extend-detail">
              <span className="nh-luxe-bar__extend-min">{nomihodaiPlan.extensionMinutes}分</span>
              <span className="nh-luxe-bar__extend-sep">／</span>
              <span className="nh-luxe-bar__extend-yen">￥{nomihodaiPlan.extensionPriceYen.toLocaleString()}</span>
              <span className="nh-luxe-bar__extend-tax">（税込）</span>
            </div>
            <p className="nh-luxe-bar__extend-caption">延長1回あたり · 男女共通</p>
          </div>
          <div className="nh-luxe-bar__rule" aria-hidden="true" />
          <div className="nh-luxe-bar__segment nh-luxe-bar__segment--checkout-big">
            <span className="nh-luxe-bar__en">CHECKOUT</span>
            <button
              type="button"
              className="nh-luxe-bar__checkout-primary"
              onClick={async () => {
                playNomihodaiSoftEndSound();
                setCheckoutError(null);
                const { error } = await requestTableCheckout();
                if (error) {
                  setCheckoutError(error.message || '送信に失敗しました');
                  return;
                }
                onOpenBill?.();
              }}
            >
              お会計する
            </button>
            {checkoutError ? (
              <p className="nh-luxe-bar__checkout-error" role="alert">
                {checkoutError}
              </p>
            ) : null}
          </div>
        </header>

        <div className="nh-active__grid nh-active__grid--ff">
          <div className="nh-active__menu-col">
            <div className="nh-ff-menu-head">
              <div className="nh-ff-menu-head__pending">
                {!canOrderMoreNomihodai ? (
                  <p className="nh-ff-pending nh-ff-pending--warn" role="alert">
                    提供後に次のご注文が可能です（未提供：{pendingNomihodaiCount}／{people}）
                  </p>
                ) : (
                  <p className="nh-ff-pending nh-ff-pending--ok">
                    未提供：{pendingNomihodaiCount}／{people}
                  </p>
                )}
              </div>
              <div className="nh-ff-menu-head__title">
                <h2 className="nh-ff-title-en">FREE FLOW MENU</h2>
                <p className="nh-ff-title-ja">飲み放題メニュー</p>
              </div>
              <div className="nh-ff-menu-head__balance" aria-hidden="true" />
            </div>

            <div className="nh-corner-stack">
              {NOMIHODAI_SECTION_KEYS.map((sectionKey) => {
                const cats = sectionBuckets[sectionKey] || [];
                return (
                  <section key={sectionKey} className={`nh-corner nh-corner--${sectionKey}`}>
                    <div className="nh-corner__cards">
                      {cats.length === 0 ? (
                        <p className="nh-corner__empty">{NOMIHODAI_SECTION_EMPTY_HINTS[sectionKey]}</p>
                      ) : (
                        cats.map(renderCategoryCard)
                      )}
                    </div>
                  </section>
                );
              })}

              {typeof addToCart === 'function' ? (
                <section className="nh-corner nh-corner--shots">
                  <div className="nh-corner-shots">
                    <ul className="nh-corner-shots__list">
                      {NOMIHODAI_EXTRA_SHOTS.map((s) => (
                        <li key={s.id} className="nh-corner-shots__row">
                          <span className="nh-corner-shots__name">{s.label}</span>
                          <span className="nh-corner-shots__price">￥{s.price.toLocaleString()}</span>
                          <button
                            type="button"
                            className="nh-corner-shots__add"
                            onClick={() => addToCart({ id: s.id, name: s.name, price: s.price })}
                          >
                            追加
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ) : null}
            </div>
            <p className="nh-ff-menu-foot">※飲み残しは別途料金をいただく場合がございます。</p>
          </div>

          <aside className="nh-active__side nh-active__side--hub nh-active__side--ff">
            <section className="nh-draft-cart" aria-labelledby="nh-draft-h">
              <div className="nh-draft-cart__bar">
                <h2 id="nh-draft-h" className="nh-draft-cart__title">
                  注文カート
                </h2>
                <span className="nh-draft-cart__count">{draftCart.length}</span>
              </div>
              <p className="nh-draft-cart__lead"></p>
              {draftCart.length === 0 ? (
                <p className="nh-draft-cart__empty">メニューの「注文」でここに追加されます</p>
              ) : (
                <ul className="nh-draft-cart__list">
                  {draftCart.map((row) => (
                    <li key={row.draftId} className="nh-draft-cart__row">
                      <span className="nh-draft-cart__name">{row.itemName}</span>
                      <button
                        type="button"
                        className="nh-draft-cart__remove"
                        onClick={() => removeDraftLine(row.draftId)}
                        aria-label={`${row.itemName}をカートから削除`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="nh-draft-cart__send-wrap">
                <button
                  type="button"
                  className="nh-draft-cart__send"
                  disabled={draftCart.length === 0 || freeKitchenSlots === 0}
                  onClick={sendDraftToKitchen}
                >
                  送信
                  {draftCart.length > 0 && freeKitchenSlots > 0 ? (
                    <span className="nh-draft-cart__send-note">
                    </span>
                  ) : null}
                </button>
                {freeKitchenSlots === 0 && draftCart.length > 0 ? (
                  <p className="nh-draft-cart__warn" role="status">
                    未提供が人数分あるため、送信は提供後までお待ちください。
                  </p>
                ) : null}
              </div>
              <p className="nh-draft-cart__foot">送信後はキッチンへ通知され、こちらから変更できません。</p>
            </section>

            <section className="nh-hub__orders nh-hub__orders--in-side nh-hub__orders--ff" aria-labelledby="nh-side-orders-h">
              <div className="nh-hub__orders-bar">
                <h2 id="nh-side-orders-h" className="nh-hub__orders-bar-title">
                  ご注文状況
                </h2>
                <p className="nh-hub__orders-bar-hint">※提供済にすると次のご注文が可能になります</p>
              </div>
              <div className="nh-hub__orders-body">
                <div className="nh-hub__stat-row">
                  <span>
                    未提供ドリンク <strong>{pendingNomihodaiCount}</strong> 杯
                  </span>
                  <span className="nh-hub__stat-people">（ご利用人数：{people}名）</span>
                </div>
                <div className="nh-hub__people-icons" aria-hidden="true">
                  {men > 0 && (
                    <span className="nh-hub__p-icon nh-hub__p-icon--m" title={`男性${men}`}>
                      🚹×{men}
                    </span>
                  )}
                  {women > 0 && (
                    <span className="nh-hub__p-icon nh-hub__p-icon--f" title={`女性${women}`}>
                      🚺×{women}
                    </span>
                  )}
                  {men === 0 && women === 0 && <span className="nh-hub__p-icon">👥×{people}</span>}
                </div>
                <div
                  className="nh-hub__progress-wrap"
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="nh-hub__progress-track">
                    <div className="nh-hub__progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
                <p className="nh-hub__progress-msg">
                  {pendingNomihodaiCount > 0
                    ? `あと${pendingNomihodaiCount}杯ご提供で次のご注文が可能になります`
                    : '未提供のドリンクはありません。追加注文が可能です。'}
                </p>
                <ul className="nh-hub__order-list nh-hub__order-list--scroll">
                  {nhOrders.length === 0 ? (
                    <li className="nh-hub__order-empty">まだ注文がありません</li>
                  ) : (
                    nhOrders.map((o) => (
                      <li key={o.id} className="nh-hub__order-row">
                        <span
                          className={`nh-hub__badge ${o.status === 'served' ? 'nh-hub__badge--done' : 'nh-hub__badge--wait'}`}
                        >
                          {o.status === 'served' ? '提供済' : '注文中'}
                        </span>
                        <span className="nh-hub__order-name">{o.itemName}</span>
                        <span className="nh-hub__order-time">{fmtOrderClock(o.createdAt)}</span>
                        <span className="nh-hub__order-chev" aria-hidden="true">
                          ›
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>

            <div className="nh-ff-sidebar-remind" role="note">
              <WineGlassIcon />
              <span>グラス交換制です。空いたグラスをお渡しください。</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
