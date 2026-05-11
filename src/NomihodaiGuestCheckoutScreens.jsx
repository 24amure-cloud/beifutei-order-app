import React, { useState } from 'react';
import { NOMIHODAI_SESSION_CLOSED_DELAY_MS } from './nomihodaiConstants.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';

function GuestBussingOkButton() {
  const { clearGuestFarewellForReuse, session } = useNomihodaiSession();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearGuestFarewellForReuse(session.tableLabel);
    } catch {
      window.alert('送信に失敗しました。通信を確認してください。');
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
        aria-label={busy ? '処理中' : 'バッシングOK。卓タブレットを次のお客様用に戻す'}
      >
        {busy ? '…' : 'バッシングOK'}
      </button>
    </div>
  );
}

function FarewellMainMessage() {
  return (
    <p className="nh-checkout__farewell-sub">
      THANK YOU
      <br />
      次のお客様ご案内準備のため
      <br />
      お席のご協力お願いいたします
    </p>
  );
}

/** ① 会計ボタン直後：FREE FLOW 終了を先に伝える */
export function NomihodaiGuestCheckoutThankYou() {
  return (
    <main className="main-content nh-active nh-active--ff nh-checkout nh-checkout--thankyou">
      <div className="nh-active__shell">
        <div className="nh-checkout__stage">
          <div className="nh-checkout__shell">
            <p className="nh-checkout__eyebrow">THANK YOU</p>
            <h1 className="nh-checkout__headline">FREE FLOWは終了しました。</h1>
            <div className="nh-checkout__body">
              <p>お会計を承りました。</p>
              <p>スタッフがお席まで伺います。</p>
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
