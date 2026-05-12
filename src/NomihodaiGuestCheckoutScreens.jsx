import React, { useState } from 'react';
import { NOMIHODAI_SESSION_CLOSED_DELAY_MS } from './nomihodaiConstants.js';
import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';

function GuestBussingOkButton() {
  const { t } = useGuestUiLocale();
  const { clearGuestFarewellForReuse, session } = useNomihodaiSession();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearGuestFarewellForReuse(session.tableLabel);
    } catch {
      window.alert(t('nh_checkout_alert_fail'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="nh-checkout__bussing nh-checkout__bussing--fab">
      <button
        type="button"
        className="nh-checkout__bussing-btn nh-checkout__bussing-btn--fab"
        onClick={onClick}
        disabled={busy}
        aria-label={busy ? t('nh_checkout_bussing_aria_busy') : t('nh_checkout_bussing_aria')}
      >
        {busy ? t('nh_checkout_bussing_busy') : t('nh_checkout_bussing')}
      </button>
    </div>
  );
}

function FarewellMainMessage() {
  const { t } = useGuestUiLocale();
  return (
    <p className="nh-checkout__farewell-sub">
      THANK YOU
      <br />
      {t('nh_checkout_farewell_coop')}
      <br />
      {t('nh_checkout_farewell_seat')}
    </p>
  );
}

/** ① 会計ボタン直後：FREE FLOW 終了を先に伝える */
export function NomihodaiGuestCheckoutThankYou() {
  const { t } = useGuestUiLocale();
  return (
    <main className="main-content nh-active nh-active--ff nh-checkout nh-checkout--thankyou">
      <div className="nh-active__shell">
        <div className="nh-checkout__stage">
          <div className="nh-checkout__shell">
            <p className="nh-checkout__eyebrow">THANK YOU</p>
            <h1 className="nh-checkout__headline">{t('nh_checkout_ty_headline')}</h1>
            <div className="nh-checkout__body">
              <p>{t('nh_checkout_ty_p1')}</p>
              <p>{t('nh_checkout_ty_p2')}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * ② 厨房で飲み放題終了後〜遅延まで：退席の強い文言は出さない
 * ③ 会計完了から N 分後：SESSION CLOSED
 */
export function NomihodaiGuestFarewellFlow({ farewell, now }) {
  const completedAt = farewell?.checkoutCompletedAt;
  const showSessionClosed =
    completedAt != null && now >= completedAt + NOMIHODAI_SESSION_CLOSED_DELAY_MS;

  if (!showSessionClosed) {
    return (
      <main className="main-content nh-active nh-active--ff nh-checkout nh-checkout--softwait">
        <div className="nh-active__shell nh-checkout__farewell-root">
          <div className="nh-checkout__stage nh-checkout__stage--farewell">
            <div className="nh-checkout__shell nh-checkout__shell--farewell">
              <p className="nh-checkout__eyebrow">THANK YOU</p>
              <FarewellMainMessage />
            </div>
          </div>
          <GuestBussingOkButton />
        </div>
      </main>
    );
  }

  return (
    <main className="main-content nh-active nh-active--ff nh-checkout nh-checkout--closed">
      <div className="nh-active__shell nh-checkout__farewell-root">
        <div className="nh-checkout__stage nh-checkout__stage--farewell">
          <div className="nh-checkout__shell nh-checkout__shell--farewell">
            <p className="nh-checkout__eyebrow nh-checkout__eyebrow--closed">SESSION CLOSED</p>
            <FarewellMainMessage />
          </div>
        </div>
        <GuestBussingOkButton />
      </div>
    </main>
  );
}
