import React, { useLayoutEffect } from 'react';
import {
  NOMIHODAI_BASE_MINUTES,
  NOMIHODAI_EXTENSION_MINUTES,
  NOMIHODAI_EXTENSION_PRICE_YEN,
} from './nomihodaiConstants.js';
import NomihodaiGuestMenuPanel from './NomihodaiGuestMenuPanel.jsx';
import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { loadNomihodaiCatalog } from './nomihodaiCatalogStorage.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getGuestIntentForTable, getNomihodaiForTable } from './nomihodaiSession.js';
import NomihodaiGuestDrinkMenu from './NomihodaiGuestDrinkMenu.jsx';
function fmtRequested(ms, locale) {
  try {
    return new Date(ms).toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** 検討ページ（開始後 FF と同系のダーク×ゴールド） */
export function NomihodaiConsiderPage() {
  const { t, locale } = useGuestUiLocale();
  const { requestNomihodaiGuestIntent, prices } = useNomihodaiSession();
  const { nomihodaiCatalog, setNomihodaiCatalog } = useNomihodaiCatalog();

  useLayoutEffect(() => {
    setNomihodaiCatalog(loadNomihodaiCatalog());
  }, [setNomihodaiCatalog]);

  return (
    <main className="main-content nh-prospect nh-prospect--ff nh-active nh-active--ff">
      <div className="nh-active__shell">
        <header className="nh-prospect__header nh-prospect__header--ref">
          <div className="nh-prospect-hero nh-prospect-hero--ref">
            <div className="nh-prospect-hero__text">
              <p className="nh-prospect-hero__eyebrow">FREE FLOW</p>
              <h1 className="nh-prospect-hero__title">{t('nh_prospect_title')}</h1>
              <p className="nh-prospect-hero__subtitle">
                {t('nh_prospect_lead')}
              </p>
            </div>
            <div className="nh-prospect__plan-badge" aria-hidden="true">
              <span className="nh-prospect__plan-badge__line1">{t('nh_auto_extend_line1', { base: NOMIHODAI_BASE_MINUTES })}</span>
              <span className="nh-prospect__plan-badge__line2">{t('nh_auto_extend_line2')}</span>
              <span className="nh-prospect__plan-badge__line3">{t('nh_auto_extend_line3')}</span>
            </div>
          </div>
        </header>

        <section className="nh-prospect__ref-pricing" aria-labelledby="nh-sum-h">
          <h2 id="nh-sum-h" className="sr-only">
            {t('nh_prospect_plan')}
          </h2>
          <div className="nh-prospect__gender-cards">
            <div className="nh-prospect__gender-card nh-prospect__gender-card--women">
              <span className="nh-prospect__gender-card__ico" aria-hidden="true">
                🚺
              </span>
              <span className="nh-prospect__gender-card__lab">{t('nh_prospect_female')}</span>
              <strong className="nh-prospect__gender-card__price">
                ￥{prices.women.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
              </strong>
            </div>
            <div className="nh-prospect__gender-card nh-prospect__gender-card--men">
              <span className="nh-prospect__gender-card__ico" aria-hidden="true">
                🚹
              </span>
              <span className="nh-prospect__gender-card__lab">{t('nh_prospect_male')}</span>
              <strong className="nh-prospect__gender-card__price">
                ￥{prices.men.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
              </strong>
            </div>
          </div>
        </section>

        <div className="nh-prospect__auto-strip" role="region" aria-label={t('nh_prospect_auto_title')}>
          <p className="nh-prospect__auto-strip__title">{t('nh_prospect_auto_title')}</p>
          <p className="nh-prospect__auto-strip__body">
            {t('nh_prospect_auto_body', {
              extMin: NOMIHODAI_EXTENSION_MINUTES,
              extYen: NOMIHODAI_EXTENSION_PRICE_YEN.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP'),
            })}
          </p>
        </div>

        <section
          className="nh-prospect__cta-block nh-prospect__cta-block--early"
          aria-label={t('nh_prospect_cta_aria')}
        >
          <div className="nh-prospect__cta-inner">
            <button
              type="button"
              className="nh-prospect__cta-btn"
              onClick={() => requestNomihodaiGuestIntent()}
            >
              <span className="nh-prospect__cta-btn-ico" aria-hidden="true">
                🍺
              </span>
              <span className="nh-prospect__cta-btn-label">{t('nh_prospect_cta')}</span>
              <span className="nh-prospect__cta-btn-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </section>

        <section
          className="nh-prospect__terms nh-prospect__terms--after-summary nh-prospect__terms--ref"
          aria-labelledby="nh-terms-h"
        >
          <h2 id="nh-terms-h" className="nh-prospect__terms-title">
            <span className="nh-prospect__terms-title-ico" aria-hidden="true">
              📋
            </span>
            {t('nh_prospect_terms_title')}
          </h2>
          <ul className="nh-prospect__terms-list nh-prospect__terms-list--checks">
            <li>{t('nh_prospect_terms_1')}</li>
            <li>{t('nh_prospect_terms_2')}</li>
            <li>{t('nh_prospect_terms_3')}</li>
          </ul>
        </section>

        <section className="nh-prospect__menu-area nh-prospect__menu-area--guest" aria-labelledby="nh-prospect-menu-h">
          <h2 id="nh-prospect-menu-h" className="nh-prospect__menu-area-title">
            {t('nh_prospect_menu_link')}
          </h2>
          <NomihodaiGuestMenuPanel
            catalog={nomihodaiCatalog}
            locale={locale}
            mode="browse"
            emptyLabel={t('nh_prospect_menu_empty')}
          />
        </section>
      </div>
    </main>
  );
}

/** ステップ2：厨房開始待ち（FF 同系） */
export function NomihodaiIntentWaitingPage() {
  const { t, locale } = useGuestUiLocale();
  const { session, clearNomihodaiGuestIntent } = useNomihodaiSession();
  const at = getGuestIntentForTable(session, session.tableLabel)?.requestedAt;

  return (
    <main className="main-content nh-wait nh-wait--ff nh-active nh-active--ff">
      <div className="nh-active__shell nh-wait__outer">
        <div className="nh-wait__shell">
          <p className="nh-wait__eyebrow">{t('nh_wait_eyebrow')}</p>
          <p className="nh-wait__subeyebrow">{t('nh_wait_sub')}</p>
          <p className="nh-wait__text">
            {t('nh_wait_sending', { table: session.tableLabel })}
            {at != null && (
              <>
                <br />
                <span className="nh-wait__time">{t('nh_wait_sent', { time: fmtRequested(at, locale) })}</span>
              </>
            )}
          </p>
          <p className="nh-wait__hint">
            {t('nh_wait_hint')}
          </p>
          <button
            type="button"
            className="nh-wait__cancel"
            onClick={() => clearNomihodaiGuestIntent(session.tableLabel)}
          >
            {t('nh_wait_cancel')}
          </button>
        </div>
      </div>
    </main>
  );
}

/** 飲み放題タブ：検討 → 待機 → 開始後はメニュー＋右カラム状況 */
export function NomihodaiTabRouter({ onOpenNomihodaiBill }) {
  const { nomihodaiActive, session } = useNomihodaiSession();
  const nh = getNomihodaiForTable(session, session.tableLabel);
  /** 会計後フローは App 全体オーバーレイで表示。ここでは重複描画しない */
  if (session.nomihodaiFarewell) return null;
  if (session.checkoutRequestAt) return null;
  if (nomihodaiActive && nh?.guestCheckoutRequestedAt) return null;

  const guestIntent = getGuestIntentForTable(session, session.tableLabel);

  if (nomihodaiActive) {
    return <NomihodaiGuestDrinkMenu onOpenBill={onOpenNomihodaiBill} />;
  }
  if (guestIntent) {
    return <NomihodaiIntentWaitingPage />;
  }
  return <NomihodaiConsiderPage />;
}
