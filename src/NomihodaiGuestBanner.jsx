import React from 'react';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getNomihodaiForTable } from './nomihodaiSession.js';

/** 飲み放題中の全タブ用コンパクト通知（ドリンクは閲覧のみの案内は各画面に表示）。会計依頼のみのときは厨房連携用の帯を出す */
export default function NomihodaiGuestBanner() {
  const { nomihodaiActive, countdown, session } = useNomihodaiSession();
  const nh = getNomihodaiForTable(session, session.tableLabel);
  const checkoutPending = !!session.checkoutRequestAt;

  if (nomihodaiActive && nh) {
    const loText = countdown.loPhase ? 'ラストオーダーです🍺' : `LOまで あと ${countdown.loMin} 分`;

    return (
      <div className="nh-guest-banner" role="status" aria-live="polite">
        <div className="nh-guest-banner__icon" aria-hidden="true">
          🍺
        </div>
        <div className="nh-guest-banner__main">
          <span className="nh-guest-banner__label">飲み放題中</span>
          <span className="nh-guest-banner__time">
            終了まで <strong>{countdown.endMin}</strong> 分
          </span>
          <span className="nh-guest-banner__lo">{loText}</span>
          {checkoutPending ? (
            <span className="nh-guest-banner__checkout">お会計のご依頼を厨房へ連携中です</span>
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
          <span className="nh-guest-banner__label">お会計のご依頼を承りました</span>
          <span className="nh-guest-banner__time">厨房へ連携しています。少々お待ちください</span>
        </div>
      </div>
    );
  }

  return null;
}
