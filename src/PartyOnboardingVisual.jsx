import React from 'react';



function clampCount(n) {

  return Math.max(0, Math.min(99, Math.floor(Number(n) || 0)));

}



/** @typedef {{

 *   table?: string,

 *   layout?: 'steps' | 'combined',

 *   step?: 'locale' | 'party',

 *   stepIndex?: number,

 *   stepTotal?: number,

 *   localeSelected?: 'ja' | 'en' | null,

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



function LocalePills({ localeSelected, onPickLocale, L }) {

  return (

    <div className="iou-locale-grid" role="group" aria-label={L.ariaLocale}>

      <button

        type="button"

        className={`iou-locale-pill iou-locale-pill--ja${localeSelected === 'ja' ? ' iou-locale-pill--active' : ''}`}

        onClick={() => onPickLocale('ja')}

        aria-label={L.jaAria ?? L.ja}

        aria-pressed={localeSelected === 'ja'}

      >

        <span className="iou-locale-pill__char" aria-hidden="true">

          {L.ja}

        </span>

        {L.jaSub ? <span className="iou-locale-pill__sub">{L.jaSub}</span> : null}

      </button>

      <button

        type="button"

        className={`iou-locale-pill iou-locale-pill--en${localeSelected === 'en' ? ' iou-locale-pill--active' : ''}`}

        onClick={() => onPickLocale('en')}

        aria-label={L.enAria ?? L.en}

        aria-pressed={localeSelected === 'en'}

      >

        <span className="iou-locale-pill__char" aria-hidden="true">

          {L.en}

        </span>

        {L.enSub ? <span className="iou-locale-pill__sub">{L.enSub}</span> : null}

      </button>

    </div>

  );

}



function PartyCounts({ counts, onChangeCount, L, total, errorMessage, onSubmit, busy, submitEnabled }) {

  return (

    <>

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

    </>

  );

}



/**

 * 言語・人数入力（客席＝1画面、厨房＝2ステップ）

 * @param {PartyOnboardingVisualProps & { labels?: Record<string, string> }} props

 */

export default function PartyOnboardingVisual({

  table,

  layout = 'steps',

  step = 'locale',

  stepIndex = 1,

  stepTotal = 2,

  localeSelected = null,

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

    ja: labels.ja ?? '日本',

    en: labels.en ?? '外国',

    start: labels.start ?? 'はじめる',

    wait: labels.wait ?? '…',

    needOne: labels.needOne ?? '1名以上',

    ariaLocale: labels.ariaLocale ?? '言語',

    ariaParty: labels.ariaParty ?? '人数',

    ...labels,

  };



  const total = counts.men + counts.women + counts.children;

  const isCombined = layout === 'combined';

  const showLocaleOnly = !isCombined && step === 'locale';

  const dialogLabel = isCombined

    ? L.ariaLocale

    : step === 'locale'

      ? L.ariaLocale

      : L.ariaParty;



  return (

    <div className={`iou-gate${isCombined ? ' iou-gate--combined' : ''}`} role="dialog" aria-modal="true" aria-label={dialogLabel}>

      <div className="iou-gate__shell">

        <header className="iou-gate__head">

          {!isCombined && step === 'party' && onBack ? (

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

          {!isCombined ? (

            <div className="iou-gate__steps" aria-hidden="true">

              {Array.from({ length: stepTotal }, (_, i) => (

                <span

                  key={i}

                  className={`iou-gate__dot${i + 1 === stepIndex ? ' iou-gate__dot--on' : ''}${i + 1 < stepIndex ? ' iou-gate__dot--done' : ''}`}

                />

              ))}

            </div>

          ) : (

            <span className="iou-gate__steps-spacer" aria-hidden="true" />

          )}

        </header>



        {showLocaleOnly ? (

          <div className="iou-gate__body iou-gate__body--locale">

            <LocalePills localeSelected={localeSelected} onPickLocale={onPickLocale} L={L} />

          </div>

        ) : isCombined ? (

          <div className="iou-gate__body iou-gate__body--combined">
            {L.localeTitle ? (
              <p className="iou-gate__section-title">{L.localeTitle}</p>
            ) : null}
            <LocalePills localeSelected={localeSelected} onPickLocale={onPickLocale} L={L} />
            {L.partyTitle ? (
              <p className="iou-gate__section-title iou-gate__section-title--party">{L.partyTitle}</p>
            ) : null}
            <PartyCounts

              counts={counts}

              onChangeCount={onChangeCount}

              L={L}

              total={total}

              errorMessage={errorMessage}

              onSubmit={onSubmit}

              busy={busy}

              submitEnabled={submitEnabled && (localeSelected === 'ja' || localeSelected === 'en')}

            />

          </div>

        ) : (

          <div className="iou-gate__body iou-gate__body--party">

            <PartyCounts

              counts={counts}

              onChangeCount={onChangeCount}

              L={L}

              total={total}

              errorMessage={errorMessage}

              onSubmit={onSubmit}

              busy={busy}

              submitEnabled={submitEnabled}

            />

          </div>

        )}

      </div>

    </div>

  );

}

