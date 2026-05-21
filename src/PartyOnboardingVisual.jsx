import React from 'react';

function clampCount(n) {
  return Math.max(0, Math.min(99, Math.floor(Number(n) || 0)));
}

/** @typedef {{
 *   table?: string,
 *   step: 'locale' | 'party',
 *   stepIndex: number,
 *   stepTotal: number,
 *   onBack?: () => void,
 *   onPickLocale: (locale: 'ja' | 'en') => void,
 *   counts: { men: number, women: number, children: number },
 *   onChangeCount: (key: 'men' | 'women' | 'children', value: number) => void,
 *   onSubmit: () => void,
 *   busy?: boolean,
 *   errorMessage?: string,
 *   submitEnabled?: boolean,
 * }} PartyOnboardingVisualProps */

const COUNT_ROWS = [
  { key: 'men', glyph: '男', tone: 'men' },
  { key: 'women', glyph: '女', tone: 'women' },
  { key: 'children', glyph: '子', tone: 'child' },
];

/**
 * 言語・人数入力（説明文なし・タップ中心）
 * @param {PartyOnboardingVisualProps & { labels?: Record<string, string> }} props
 */
export default function PartyOnboardingVisual({
  table,
  step,
  stepIndex,
  stepTotal,
  onBack,
  onPickLocale,
  counts,
  onChangeCount,
  onSubmit,
  busy = false,
  errorMessage = '',
  submitEnabled = true,
  labels = {},
}) {
  const L = {
    table: labels.table ?? '卓',
    ja: labels.ja ?? '日',
    en: labels.en ?? '外',
    jaAria: labels.jaAria ?? '日本人',
    enAria: labels.enAria ?? '外国人',
    jaSub: labels.jaSub ?? '日本人',
    enSub: labels.enSub ?? '外国人',
    start: labels.start ?? 'はじめる',
    wait: labels.wait ?? '…',
    needOne: labels.needOne ?? '1名以上',
    ...labels,
  };

  const total = counts.men + counts.women + counts.children;

  return (
    <div className="iou-gate" role="dialog" aria-modal="true" aria-label={step === 'locale' ? L.ariaLocale : L.ariaParty}>
      <div className="iou-gate__shell">
        <header className="iou-gate__head">
          {step === 'party' && onBack ? (
            <button type="button" className="iou-gate__back" onClick={onBack} aria-label={L.back ?? '戻る'}>
              <span aria-hidden="true">‹</span>
            </button>
          ) : (
            <span className="iou-gate__back-spacer" aria-hidden="true" />
          )}
          {table ? (
            <div className="iou-gate__table" aria-label={`${L.table} ${table}`}>
              <span className="iou-gate__table-lab">{L.table}</span>
              <span className="iou-gate__table-num">{table}</span>
            </div>
          ) : (
            <span className="iou-gate__table-spacer" />
          )}
          <div className="iou-gate__steps" aria-hidden="true">
            {Array.from({ length: stepTotal }, (_, i) => (
              <span
                key={i}
                className={`iou-gate__dot${i + 1 === stepIndex ? ' iou-gate__dot--on' : ''}${i + 1 < stepIndex ? ' iou-gate__dot--done' : ''}`}
              />
            ))}
          </div>
        </header>

        {step === 'locale' ? (
          <div className="iou-gate__body iou-gate__body--locale">
            <div className="iou-locale-grid">
              <button
                type="button"
                className="iou-locale-pill iou-locale-pill--ja"
                onClick={() => onPickLocale('ja')}
                aria-label={L.jaAria}
              >
                <span className="iou-locale-pill__char" aria-hidden="true">
                  {L.ja}
                </span>
                <span className="iou-locale-pill__sub">{L.jaSub}</span>
              </button>
              <button
                type="button"
                className="iou-locale-pill iou-locale-pill--en"
                onClick={() => onPickLocale('en')}
                aria-label={L.enAria}
              >
                <span className="iou-locale-pill__char" aria-hidden="true">
                  {L.en}
                </span>
                <span className="iou-locale-pill__sub">{L.enSub}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="iou-gate__body iou-gate__body--party">
            <div className="iou-count-grid">
              {COUNT_ROWS.map(({ key, glyph, tone }) => {
                const val = counts[key];
                return (
                  <div key={key} className={`iou-count-card iou-count-card--${tone}`}>
                    <span className="iou-count-card__glyph" aria-hidden="true">
                      {glyph}
                    </span>
                    <div className="iou-count-card__ctrl">
                      <button
                        type="button"
                        className="iou-count-card__btn"
                        disabled={val <= 0}
                        aria-label={`${L[key] ?? key} 減らす`}
                        onClick={() => onChangeCount(key, clampCount(val - 1))}
                      >
                        −
                      </button>
                      <span className="iou-count-card__num" aria-live="polite">
                        {val}
                      </span>
                      <button
                        type="button"
                        className="iou-count-card__btn"
                        disabled={val >= 99}
                        aria-label={`${L[key] ?? key} 増やす`}
                        onClick={() => onChangeCount(key, clampCount(val + 1))}
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`iou-total${total > 0 ? ' iou-total--ok' : ''}`} aria-live="polite">
              <span className="iou-total__n">{total}</span>
              <span className="iou-total__unit" aria-hidden="true">
                名
              </span>
            </div>

            {errorMessage ? (
              <p className="iou-gate__err" role="alert">
                <span aria-hidden="true">!</span> {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              className="iou-gate__go"
              disabled={busy || !submitEnabled || total < 1}
              onClick={onSubmit}
              aria-label={busy ? L.wait : L.start}
            >
              <span className="iou-gate__go-arrow" aria-hidden="true">
                {busy ? '…' : '→'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
