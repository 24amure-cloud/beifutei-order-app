import React from 'react';

/**
 * @param {{
 *   title: string,
 *   count: number,
 *   emptyLabel?: string,
 *   segments: Array<{ key: string, label: string, value: number, pct: number, tone: string }>,
 * }} props
 */
function LedgerStatCard({ title, count, emptyLabel = 'データなし', segments }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const hasData = count > 0 && total > 0;

  return (
    <article className="ledger-stat-card">
      <header className="ledger-stat-card__head">
        <h3 className="ledger-stat-card__title">{title}</h3>
        <span className="ledger-stat-card__count">{count}件</span>
      </header>

      {!hasData ? (
        <p className="ledger-stat-card__empty">{emptyLabel}</p>
      ) : (
        <>
          <div className="ledger-stat-card__bar" role="img" aria-label={`${title}の内訳`}>
            {segments.map((seg) => (
              <span
                key={seg.key}
                className={`ledger-stat-card__seg ledger-stat-card__seg--${seg.tone}`}
                style={{ width: `${Math.max(seg.pct, seg.value > 0 ? 4 : 0)}%` }}
                title={`${seg.label} ${seg.value}名 ${seg.pct.toFixed(0)}%`}
              />
            ))}
          </div>
          <ul className="ledger-stat-card__legend">
            {segments.map((seg) => (
              <li key={seg.key} className="ledger-stat-card__row">
                <span className={`ledger-stat-card__dot ledger-stat-card__dot--${seg.tone}`} aria-hidden />
                <span className="ledger-stat-card__lab">{seg.label}</span>
                <span className="ledger-stat-card__num">{seg.value}名</span>
                <span className="ledger-stat-card__pct">{seg.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

/** @param {{ partyRatio: object|null, localeRatio: object|null, genderRatio?: object|null, nhSessionCount?: number }} props */
export default function LedgerDemographicsCards({ partyRatio, localeRatio, genderRatio, nhSessionCount = 0 }) {
  const partySegments = partyRatio
    ? [
        { key: 'm', label: '男', value: partyRatio.menSum, pct: partyRatio.menPct, tone: 'men' },
        { key: 'w', label: '女', value: partyRatio.womenSum, pct: partyRatio.womenPct, tone: 'women' },
        { key: 'c', label: '子', value: partyRatio.childrenSum, pct: partyRatio.childrenPct, tone: 'child' },
      ]
    : [];

  const localeSegments = localeRatio
    ? [
        { key: 'ja', label: '日', value: localeRatio.jaCount, pct: localeRatio.jaPct, tone: 'ja' },
        { key: 'en', label: '外', value: localeRatio.enCount, pct: localeRatio.enPct, tone: 'en' },
      ]
    : [];

  const nhSegments = genderRatio
    ? [
        { key: 'm', label: '男', value: genderRatio.menSum, pct: genderRatio.menPct, tone: 'men' },
        { key: 'w', label: '女', value: genderRatio.womenSum, pct: genderRatio.womenPct, tone: 'women' },
      ]
    : [];

  return (
    <div className="master-ledger-demographics" aria-label="来店者構成">
      <LedgerStatCard
        title="男女児（会計時）"
        count={partyRatio?.checkoutCount ?? 0}
        segments={partySegments}
      />
      <LedgerStatCard
        title="日／外"
        count={localeRatio?.checkoutCount ?? 0}
        segments={localeSegments}
      />
      <LedgerStatCard
        title="飲み放題・男女"
        count={nhSessionCount}
        emptyLabel="飲み放題会計なし"
        segments={nhSegments}
      />
    </div>
  );
}
