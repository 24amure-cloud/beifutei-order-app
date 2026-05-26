import React, { useCallback, useMemo, useState } from 'react';
import { buildGuestOrderPageUrl, buildKitchenPageUrl } from './guestOrderUrl.js';
import { collectKnownTableLabels } from './nomihodaiSession.js';

/** 客席オーダー用 URL（卓ごとコピー） */
export default function MasterGuestUrlsPanel({ session }) {
  const knownTableLabels = useMemo(() => collectKnownTableLabels(session), [session]);
  const [customTableLabel, setCustomTableLabel] = useState('');
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(20);
  const [copyFlash, setCopyFlash] = useState(null);

  const copyText = useCallback(async (text, flashKey) => {
    try {
      await navigator.clipboard.writeText(text);
      if (flashKey != null) {
        setCopyFlash(flashKey);
        window.setTimeout(() => setCopyFlash((k) => (k === flashKey ? null : k)), 1600);
      }
    } catch {
      window.prompt('コピーできませんでした。手動でコピーしてください', text);
    }
  }, []);

  const copyGuestUrlForTable = useCallback(
    async (label) => {
      await copyText(buildGuestOrderPageUrl(label), `g:${label}`);
    },
    [copyText],
  );

  const copyKitchenUrlForTable = useCallback(
    async (label) => {
      await copyText(buildKitchenPageUrl(label), `k:${label}`);
    },
    [copyText],
  );

  const copyGuestUrlRange = useCallback(async () => {
    const a = Math.max(1, Math.min(99, Number(rangeFrom) || 1));
    const b = Math.max(1, Math.min(99, Number(rangeTo) || 1));
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo > 60) {
      window.alert('一度にコピーできるのは最大60卓までです。');
      return;
    }
    const lines = [];
    for (let i = lo; i <= hi; i += 1) {
      const lbl = String(i);
      lines.push(`${lbl}\t${buildGuestOrderPageUrl(lbl)}`);
    }
    await copyText(lines.join('\n'), 'range');
  }, [copyText, rangeFrom, rangeTo]);

  return (
    <details className="master-guest-urls">
      <summary className="master-guest-urls__summary">客席オーダー用URL（卓ごと・QR用）</summary>
      <div className="master-guest-urls__body">
        {knownTableLabels.length > 0 ? (
          <ul className="master-ops-guest-url__list">
            {knownTableLabels.map((lbl) => (
              <li key={lbl} className="master-ops-guest-url__row">
                <span className="master-ops-guest-url__label">卓{lbl}</span>
                <button
                  type="button"
                  className="master-btn master-btn--secondary master-btn--small"
                  onClick={() => copyGuestUrlForTable(lbl)}
                >
                  {copyFlash === `g:${lbl}` ? 'コピー済' : '客席URL'}
                </button>
                <button
                  type="button"
                  className="master-btn master-btn--secondary master-btn--small"
                  onClick={() => copyKitchenUrlForTable(lbl)}
                >
                  {copyFlash === `k:${lbl}` ? 'コピー済' : '厨房URL'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="master-ops-guest-url__empty">まだ卓の注文データがありません（下で番号指定できます）。</p>
        )}
        <div className="master-ops-guest-url__manual-row">
          <input
            className="master-ops-guest-url__input"
            type="text"
            inputMode="numeric"
            placeholder="卓番"
            value={customTableLabel}
            onChange={(e) => setCustomTableLabel(e.target.value)}
          />
          <button
            type="button"
            className="master-btn master-btn--secondary master-btn--small"
            disabled={!String(customTableLabel).trim()}
            onClick={() => copyGuestUrlForTable(String(customTableLabel).trim())}
          >
            コピー
          </button>
        </div>
        <div className="master-ops-guest-url__range-row">
          <input
            className="master-ops-guest-url__input master-ops-guest-url__input--num"
            type="number"
            min={1}
            max={99}
            value={rangeFrom}
            onChange={(e) => setRangeFrom(Number(e.target.value))}
          />
          <span>〜</span>
          <input
            className="master-ops-guest-url__input master-ops-guest-url__input--num"
            type="number"
            min={1}
            max={99}
            value={rangeTo}
            onChange={(e) => setRangeTo(Number(e.target.value))}
          />
          <button type="button" className="master-btn master-btn--secondary master-btn--small" onClick={copyGuestUrlRange}>
            {copyFlash === 'range' ? 'コピー済' : '連番コピー'}
          </button>
        </div>
      </div>
    </details>
  );
}
