import React, { useLayoutEffect, useMemo, useState } from 'react';
import { NOMIHODAI_EXTRA_SHOTS } from './NomihoudaiPage.jsx';
import NomihodaiGuestMenuPanel from './NomihodaiGuestMenuPanel.jsx';
import { resolveNomihodaiVisualSlot } from './data/drinkHeroImages.js';
import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { loadNomihodaiCatalog } from './nomihodaiCatalogStorage.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getNomihodaiForTable, NOMIHODAI_PENDING_QUEUE_LIMIT_ENABLED } from './nomihodaiSession.js';
import { playNomihodaiSoftEndSound } from './nomihodaiSoftEndSound.js';
import {
  buildNomihodaiGuestLabelIndex,
  nomihodaiGuestItemLabel,
} from './nomihodaiGuestItemLabels.js';

function fmtOrderClock(ms, locale) {
  try {
    return new Date(ms ?? Date.now()).toLocaleTimeString(locale === 'en' ? 'en-US' : 'ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

export default function NomihodaiGuestDrinkMenu({ onOpenBill }) {
  const { t, locale } = useGuestUiLocale();
  const { nomihodaiCatalog, setNomihodaiCatalog } = useNomihodaiCatalog();

  /** 開始後メニュー表示時に最新カタログへ同期（導入ページと同一データ） */
  useLayoutEffect(() => {
    setNomihodaiCatalog(loadNomihodaiCatalog());
  }, [setNomihodaiCatalog]);
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

  /** ビール以外・過去に注文したドリンクをワンタップ用に（新しい順・重複除く） */
  const okawariCandidates = useMemo(() => {
    const byItemId = new Map();
    for (const cat of nomihodaiCatalog || []) {
      const slot = resolveNomihodaiVisualSlot(cat);
      if (slot === 'beer') continue;
      for (const it of cat.items || []) {
        byItemId.set(it.id, { cat, it, slot });
      }
    }
    const seen = new Set();
    const out = [];
    for (const o of nhOrders) {
      const name = String(o.itemName || '');
      if (/ビール|ＢＥＥＲ|beer/i.test(name)) continue;
      const meta = byItemId.get(o.itemId);
      if (!meta || meta.slot === 'beer') continue;
      const key = String(o.itemId || name);
      if (seen.has(key)) continue;
      seen.add(key);
    out.push({
      itemId: meta.it.id,
      itemName: meta.it.name,
    });
      if (out.length >= 16) break;
    }
    return out;
  }, [nhOrders, nomihodaiCatalog]);

  const nhGuestLabelIndex = useMemo(
    () => buildNomihodaiGuestLabelIndex(nomihodaiCatalog),
    [nomihodaiCatalog]
  );

  const freeKitchenSlots = NOMIHODAI_PENDING_QUEUE_LIMIT_ENABLED
    ? Math.max(0, people - pendingNomihodaiCount)
    : Number.MAX_SAFE_INTEGER;

  const addDraftLine = (itemId, itemName, itemPrice) => {
    setDraftCart((prev) => [
      ...prev,
      {
        draftId: `d-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        itemId,
        itemName,
        ...(itemPrice != null && Number.isFinite(Number(itemPrice)) && Number(itemPrice) > 0
          ? { itemPrice: Number(itemPrice) }
          : {}),
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
    batch.forEach((row) =>
      addNomihodaiOrder({
        itemId: row.itemId,
        itemName: row.itemName,
        itemPrice: row.itemPrice,
      })
    );
    setDraftCart((prev) => prev.slice(nSend));
  };

  if (!n?.active) return null;

  const remainingMs = Math.max(0, n.endMs - now);
  const sessionClock = fmtSessionRemain(remainingMs);
  const nextChargeMin = Math.max(0, Math.ceil(remainingMs / 60000));

  return (
    <main className="main-content nh-active nh-active--ff">
      <div className="nh-active__shell">
        <header className="nh-luxe-bar" aria-label={t('nh_drink_bar_aria')}>
          <div className="nh-luxe-bar__segment">
            <ClockIcon />
            <span className="nh-luxe-bar__en">SESSION TIME</span>
            <span className="nh-luxe-bar__hero nh-luxe-bar__hero--time">{sessionClock}</span>
            <span className="nh-luxe-bar__ja">{t('nh_drink_remain')}</span>
          </div>
          <div className="nh-luxe-bar__rule" aria-hidden="true" />
          <div className="nh-luxe-bar__segment nh-luxe-bar__segment--next-charge">
            <BellIcon />
            <span className="nh-luxe-bar__en">NEXT CHARGE</span>
            <p className="nh-luxe-bar__hero nh-luxe-bar__hero--charge">
              <strong>{nextChargeMin}</strong>
              <span className="nh-luxe-bar__min">MIN</span>
            </p>
            <span className="nh-luxe-bar__ja">{t('nh_drink_extend_until')}</span>
          </div>
          <div className="nh-luxe-bar__rule" aria-hidden="true" />
          <div className="nh-luxe-bar__segment nh-luxe-bar__segment--extend nh-luxe-bar__segment--extend-info">
            <span className="nh-luxe-bar__en">AUTO EXTEND</span>
            <span className="nh-luxe-bar__mid nh-luxe-bar__mid--extend-title">{t('nh_drink_extend_system')}</span>
            <div className="nh-luxe-bar__extend-detail">
              <span className="nh-luxe-bar__extend-min">
                {t('nh_drink_extend_min', { n: nomihodaiPlan.extensionMinutes })}
              </span>
              <span className="nh-luxe-bar__extend-sep">／</span>
              <span className="nh-luxe-bar__extend-yen">
                ￥
                {nomihodaiPlan.extensionPriceYen.toLocaleString(
                  locale === 'en' ? 'en-US' : 'ja-JP'
                )}
              </span>
              <span className="nh-luxe-bar__extend-tax">{t('nh_drink_extend_tax')}</span>
            </div>
            <p className="nh-luxe-bar__extend-caption">{t('nh_drink_extend_cap')}</p>
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
                  setCheckoutError(
                    error.message === 'NO_TABLE' ? t('notice_checkout_no_table') : error.message || t('nh_drink_send_fail'),
                  );
                  return;
                }
                onOpenBill?.();
              }}
            >
              {t('nh_drink_checkout')}
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
                    {t('nh_drink_queue_full', { p: pendingNomihodaiCount, people })}
                  </p>
                ) : (
                  <p className="nh-ff-pending nh-ff-pending--ok">
                    {t('nh_drink_queue_short', { p: pendingNomihodaiCount, people })}
                  </p>
                )}
              </div>
              <div className="nh-ff-menu-head__title">
                <h2 className="nh-ff-title-en">FREE FLOW MENU</h2>
                <p className="nh-ff-title-ja">{t('nh_drink_menu_title')}</p>
              </div>
              <div className="nh-ff-menu-head__balance" aria-hidden="true" />
            </div>

            <NomihodaiGuestMenuPanel
              catalog={nomihodaiCatalog}
              locale={locale}
              mode="order"
              orderLabel={t('nh_drink_order')}
              addCartLabel={t('nh_drink_add_cart')}
              emptyLabel={t('nh_prospect_menu_empty')}
              showExtraShots
              extraShots={NOMIHODAI_EXTRA_SHOTS}
              onOrder={(it) => addDraftLine(it.id, it.name, it.price)}
              onAddShot={(it) => addDraftLine(it.id, it.name, it.price)}
            />
            <p className="nh-ff-menu-foot">{t('nh_drink_menu_foot')}</p>
          </div>

          <aside className="nh-active__side nh-active__side--hub nh-active__side--ff">
            <section className="nh-draft-cart" aria-labelledby="nh-draft-h">
              <div className="nh-draft-cart__bar">
                <h2 id="nh-draft-h" className="nh-draft-cart__title">
                  {t('nh_drink_cart_title')}
                </h2>
                <span className="nh-draft-cart__count">{draftCart.length}</span>
              </div>
              <p className="nh-draft-cart__lead"></p>
              {draftCart.length === 0 ? (
                <p className="nh-draft-cart__empty">{t('nh_drink_cart_empty')}</p>
              ) : (
                <ul className="nh-draft-cart__list">
                  {draftCart.map((row) => (
                    <li key={row.draftId} className="nh-draft-cart__row">
                      <span className="nh-draft-cart__name">
                        {nomihodaiGuestItemLabel(nhGuestLabelIndex, row.itemId, row.itemName, locale)}
                        {row.itemPrice != null && row.itemPrice > 0 ? (
                          <span className="nh-draft-cart__subprice">
                            {' '}
                            ￥{row.itemPrice.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="nh-draft-cart__remove"
                        onClick={() => removeDraftLine(row.draftId)}
                        aria-label={t('nh_drink_remove_aria', {
                          name: nomihodaiGuestItemLabel(nhGuestLabelIndex, row.itemId, row.itemName, locale),
                        })}
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
                  {t('nh_drink_send')}
                  {draftCart.length > 0 && freeKitchenSlots > 0 ? (
                    <span className="nh-draft-cart__send-note">
                    </span>
                  ) : null}
                </button>
                {freeKitchenSlots === 0 && draftCart.length > 0 ? (
                  <p className="nh-draft-cart__warn" role="status">
                    {t('nh_drink_send_wait')}
                  </p>
                ) : null}
              </div>
              <p className="nh-draft-cart__foot">{t('nh_drink_cart_foot')}</p>
            </section>

            {okawariCandidates.length > 0 ? (
              <section className="nh-okawari" aria-labelledby="nh-okawari-h">
                <div className="nh-okawari__bar">
                  <h2 id="nh-okawari-h" className="nh-okawari__title">
                    {t('nh_drink_refill')}
                  </h2>
                </div>
                <div className="nh-okawari__strip" role="list">
                  {okawariCandidates.map((row) => (
                    <button
                      key={row.itemId}
                      type="button"
                      className="nh-okawari__chip"
                      role="listitem"
                      onClick={() => addDraftLine(row.itemId, row.itemName)}
                    >
                      <span className="nh-okawari__chip-name">
                        {nomihodaiGuestItemLabel(nhGuestLabelIndex, row.itemId, row.itemName, locale)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="nh-hub__orders nh-hub__orders--in-side nh-hub__orders--ff" aria-labelledby="nh-side-orders-h">
              <div className="nh-hub__orders-bar">
                <h2 id="nh-side-orders-h" className="nh-hub__orders-bar-title">
                  {t('nh_drink_hub_title')}
                </h2>
                <p className="nh-hub__orders-bar-hint">
                  {NOMIHODAI_PENDING_QUEUE_LIMIT_ENABLED
                    ? t('nh_drink_hub_hint_served')
                    : t('nh_drink_hub_hint_kitchen')}
                </p>
              </div>
              <div className="nh-hub__orders-body">
                <div className="nh-hub__stat-row">
                  <span>{t('nh_drink_hub_pending', { n: pendingNomihodaiCount })}</span>
                  <span className="nh-hub__stat-people">{t('nh_drink_hub_people', { n: people })}</span>
                </div>
                <div className="nh-hub__people-icons" aria-hidden="true">
                  {men > 0 && (
                    <span className="nh-hub__p-icon nh-hub__p-icon--m" title={t('nh_drink_hub_male_title', { m: men })}>
                      🚹×{men}
                    </span>
                  )}
                  {women > 0 && (
                    <span className="nh-hub__p-icon nh-hub__p-icon--f" title={t('nh_drink_hub_female_title', { f: women })}>
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
                {(NOMIHODAI_PENDING_QUEUE_LIMIT_ENABLED || pendingNomihodaiCount === 0) && (
                  <p className="nh-hub__progress-msg">
                    {NOMIHODAI_PENDING_QUEUE_LIMIT_ENABLED
                      ? pendingNomihodaiCount > 0
                        ? t('nh_drink_hub_more', { n: pendingNomihodaiCount })
                        : t('nh_drink_hub_ready')
                      : t('nh_drink_hub_none')}
                  </p>
                )}
                <ul className="nh-hub__order-list nh-hub__order-list--scroll">
                  {nhOrders.length === 0 ? (
                    <li className="nh-hub__order-empty">{t('nh_drink_hub_no_orders')}</li>
                  ) : (
                    nhOrders.map((o) => (
                      <li key={o.id} className="nh-hub__order-row">
                        <span
                          className={`nh-hub__badge ${o.status === 'served' ? 'nh-hub__badge--done' : 'nh-hub__badge--wait'}`}
                        >
                          {o.status === 'served' ? t('nh_drink_status_served') : t('nh_drink_status_pending')}
                        </span>
                        <span className="nh-hub__order-name">
                          {nomihodaiGuestItemLabel(nhGuestLabelIndex, o.itemId, o.itemName, locale)}
                        </span>
                        <span className="nh-hub__order-time">{fmtOrderClock(o.createdAt, locale)}</span>
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
              <span>{t('nh_drink_glass_note')}</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
