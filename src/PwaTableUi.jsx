import React, { useEffect, useState } from 'react';
import { buildGuestOrderPageUrl } from './guestOrderUrl.js';
import { isStandalonePwa } from './pwaTableBootstrap.js';
import { isKitchenAppPage, normalizeTableLabelKey } from './nomihodaiSession.js';

const INSTALL_HINT_KEY = 'beifutei-pwa-install-hint-dismissed-v1';

/** 卓番が URL にある状態で、まだホーム画面追加していないときの案内 */
export function PwaInstallTableHint({ tableLabel }) {
  const lbl = normalizeTableLabelKey(tableLabel ?? '');
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!lbl || isStandalonePwa() || isKitchenAppPage()) {
      setHidden(true);
      return;
    }
    try {
      setHidden(localStorage.getItem(INSTALL_HINT_KEY) === '1');
    } catch {
      setHidden(false);
    }
  }, [lbl]);

  if (hidden || !lbl) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(INSTALL_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <div className="pwa-install-hint" role="note">
      <p className="pwa-install-hint__text">
        <strong>卓{lbl}</strong>のタブレットなら、この画面のまま「ホーム画面に追加」してください。追加後も卓番はこの端末に保存されます。
      </p>
      <button type="button" className="pwa-install-hint__dismiss" onClick={dismiss}>
        閉じる
      </button>
    </div>
  );
}

/** PWA 起動で卓番が取れないとき（QR 未設定のまま追加した等） */
export function GuestPwaTableMissingScreen() {
  const [tableInput, setTableInput] = useState('');

  const apply = () => {
    const lbl = normalizeTableLabelKey(tableInput);
    if (!lbl) {
      window.alert('卓番（1〜8など）を入力してください。');
      return;
    }
    window.location.href = buildGuestOrderPageUrl(lbl);
  };

  return (
    <div className="pwa-table-missing">
      <div className="pwa-table-missing__card">
        <h1 className="pwa-table-missing__title">卓番の設定が必要です</h1>
        <p className="pwa-table-missing__lead">
          ホーム画面から開いたとき、URL の卓番（<code>?table=</code>）が消えています。スタッフから渡された卓番を入力するか、QR の URL を開き直してからホーム画面に追加し直してください。
        </p>
        <label className="pwa-table-missing__field">
          <span>卓番</span>
          <input
            type="text"
            inputMode="numeric"
            value={tableInput}
            onChange={(e) => setTableInput(e.target.value)}
            placeholder="例: 3"
            autoComplete="off"
          />
        </label>
        <button type="button" className="pwa-table-missing__btn" onClick={apply}>
          この卓で開始
        </button>
      </div>
    </div>
  );
}

/** 常時表示の卓番バッジ（PWA では特に重要） */
export function PwaTableRibbon({ tableLabel, role = 'guest' }) {
  const lbl = normalizeTableLabelKey(tableLabel ?? '');
  if (!lbl) return null;

  return (
    <div
      className={`pwa-table-ribbon pwa-table-ribbon--${role}${isStandalonePwa() ? ' pwa-table-ribbon--standalone' : ''}`}
      aria-label={`現在の卓番 ${lbl}`}
    >
      <span className="pwa-table-ribbon__label">{role === 'kitchen' ? '操作中卓' : '卓番'}</span>
      <strong className="pwa-table-ribbon__num">{lbl}</strong>
    </div>
  );
}
