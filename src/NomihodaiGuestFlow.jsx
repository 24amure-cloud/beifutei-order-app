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

function fmtYen(n, locale) {
  return n.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP');
}

/** 検討ページ（シンプル・高級感） */
export function NomihodaiConsiderPage() {
  const { t, locale } = useGuestUiLocale();
  const { requestNomihodaiGuestIntent, prices } = useNomihodaiSession();
  const { nomihodaiCatalog, setNomihodaiCatalog } = useNomihodaiCatalog();

  useLayoutEffect(() => {
    setNomihodaiCatalog(loadNomihodaiCatalog());
  }, [setNomihodaiCatalog]);

  return (
    <main className="main-content nh-pre nh-pre--lux">
      <div className="nh-pre__inner">
        <header className="nh-pre-hero">
          <p className="nh-pre-hero__course" aria-label={t('nh_prospect_time_aria', { base: NOMIHODAI_BASE_MINUTES })}>
            <span className="nh-pre-hero__course-num">{NOMIHODAI_BASE_MINUTES}</span>
            <span className="nh-pre-hero__course-unit">{t('nh_prospect_time_unit')}</span>
          </p>
          <h1 className="nh-pre-hero__title">{t('nh_prospect_title')}</h1>
        </header>

        <section className="nh-pre-board" aria-label={t('nh_prospect_plan')}>
          <div className="nh-pre-board__prices">
            <div className="nh-pre-board__price nh-pre-board__price--women">
              <span className="nh-pre-board__who">{t('nh_prospect_female')}</span>
              <p className="nh-pre-board__amount">
                <span className="nh-pre-board__yen">￥</span>
                {fmtYen(prices.women, locale)}
              </p>
              <span className="nh-pre-board__tax">{t('nh_prospect_tax')}</span>
            </div>
            <div className="nh-pre-board__divider" aria-hidden="true" />
            <div className="nh-pre-board__price nh-pre-board__price--men">
              <span className="nh-pre-board__who">{t('nh_prospect_male')}</span>
              <p className="nh-pre-board__amount">
                <span className="nh-pre-board__yen">￥</span>
                {fmtYen(prices.men, locale)}
              </p>
              <span className="nh-pre-board__tax">{t('nh_prospect_tax')}</span>
            </div>
          </div>
          <div className="nh-pre-board__extend" aria-label={t('nh_prospect_auto_title')}>
            <span className="nh-pre-board__extend-label">{t('nh_prospect_auto_title')}</span>
            <span className="nh-pre-board__extend-min">
              {NOMIHODAI_EXTENSION_MINUTES}
              {t('nh_prospect_extend_min_unit')}
            </span>
            <span className="nh-pre-board__extend-yen">
              ￥{fmtYen(NOMIHODAI_EXTENSION_PRICE_YEN, locale)}
            </span>
          </div>
        </section>

        <button
          type="button"
          className="nh-pre-cta"
          aria-label={t('nh_prospect_cta_aria')}
          onClick={() => requestNomihodaiGuestIntent()}
        >
          {t('nh_prospect_cta')}
        </button>

        <section className="nh-pre-terms" aria-labelledby="nh-pre-terms-h">
          <h2 id="nh-pre-terms-h" className="nh-pre-terms__title">
            {t('nh_prospect_terms_title')}
          </h2>
          <ul className="nh-pre-terms__list">
            <li>{t('nh_prospect_terms_1')}</li>
            <li>{t('nh_prospect_terms_2')}</li>
            <li>{t('nh_prospect_terms_3')}</li>
          </ul>
        </section>

        <section className="nh-pre-menu" aria-labelledby="nh-pre-menu-h">
          <h2 id="nh-pre-menu-h" className="nh-pre-menu__label">
            {t('nh_prospect_menu_label')}
          </h2>
          <NomihodaiGuestMenuPanel
            catalog={nomihodaiCatalog}
            locale={locale}
            mode="browse"
            browseLayout="tabs"
            emptyLabel={t('nh_prospect_menu_empty')}
          />
        </section>
      </div>
    </main>
  );
}

/** 厨房開始待ち */
export function NomihodaiIntentWaitingPage() {
  const { t } = useGuestUiLocale();
  const { session, clearNomihodaiGuestIntent } = useNomihodaiSession();

  return (
    <main className="main-content nh-pre-wait nh-pre-wait--lux">
      <div className="nh-pre-wait__inner">
        <div className="nh-pre-wait__card" role="status" aria-live="polite">
          <div className="nh-pre-wait__ring" aria-hidden="true" />
          <p className="nh-pre-wait__status">{t('nh_wait_title')}</p>
          <p className="nh-pre-wait__table-num">{session.tableLabel}</p>
          <p className="nh-pre-wait__table-unit">{t('nh_wait_table_unit')}</p>
          <button
            type="button"
            className="nh-pre-wait__cancel"
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
  if (nomihodaiActive) {
    return <NomihodaiGuestDrinkMenu onOpenBill={onOpenNomihodaiBill} />;
  }

  const guestIntent = getGuestIntentForTable(session, session.tableLabel);
  if (session.nomihodaiFarewell && !guestIntent) return null;
  if (session.checkoutRequestAt && !guestIntent) return null;
  if (guestIntent) {
    return <NomihodaiIntentWaitingPage />;
  }
  return <NomihodaiConsiderPage />;
}
