import React from 'react';
import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getNomihodaiForTable } from './nomihodaiSession.js';

/** 飲み放題中の全タブ用コンパクト通知（ドリンクは閲覧のみの案内は各画面に表示）。会計依頼のみのときは厨房連携用の帯を出す */
export default function NomihodaiGuestBanner() {
  const { t } = useGuestUiLocale();
  const { nomihodaiActive, countdown, session } = useNomihodaiSession();
  const nh = getNomihodaiForTable(session, session.tableLabel);
  const checkoutPending = !!session.checkoutRequestAt;

  if (nomihodaiActive && nh) {
    const extendMin = countdown.extendMin ?? countdown.endMin;
    const endMin = countdown.endMin;
    const inFinalMinute = extendMin != null && extendMin <= 0;
    const showSplit =
      !inFinalMinute &&
      endMin != null &&
      extendMin != null &&
      endMin !== extendMin;

    return (
      <div className="nh-guest-banner" role="status" aria-live="polite">
        <div className="nh-guest-banner__icon" aria-hidden="true">
          🍺
        </div>
        <div className="nh-guest-banner__main">
          <span className="nh-guest-banner__label">{t('nh_banner_active')}</span>
          <div className="nh-guest-banner__body">
            {inFinalMinute ? (
              <span className="nh-guest-banner__time nh-guest-banner__time--solo">
                {t('nh_banner_extend_soon')}
              </span>
            ) : showSplit ? (
              <>
                <span className="nh-guest-banner__time">
                  {t('nh_banner_until_end', { m: endMin })}
                </span>
                <span className="nh-guest-banner__rule" aria-hidden="true" />
                <span className="nh-guest-banner__lo">
                  {t('nh_banner_until_extend', { m: extendMin })}
                </span>
              </>
            ) : (
              <span className="nh-guest-banner__time nh-guest-banner__time--solo">
                {t('nh_banner_until_lo', { m: endMin })}
              </span>
            )}
          </div>
          {checkoutPending ? (
            <span className="nh-guest-banner__checkout">{t('nh_banner_checkout_sync')}</span>
          ) : null}
        </div>
      </div>
    );
  }

  if (checkoutPending) {
    return (
      <div
        className="nh-guest-banner nh-guest-banner--checkout-only"
        role="status"
        aria-live="polite"
      >
        <div className="nh-guest-banner__icon" aria-hidden="true">
          🧾
        </div>
        <div className="nh-guest-banner__main">
          <span className="nh-guest-banner__label">{t('nh_banner_checkout_ok_title')}</span>
          <div className="nh-guest-banner__body">
            <span className="nh-guest-banner__time nh-guest-banner__time--solo">
              {t('nh_banner_checkout_ok_body')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
