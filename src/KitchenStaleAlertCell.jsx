import React from 'react';

/**
 * 未提供の経過時間に応じた出し忘れサイン（5 / 10 / 15分+）
 * @param {{
 *   kind: 'drink'|'food',
 *   summary: { total: number, worstMin: number, staleCount: number, level: string, bucketLabel: string },
 *   onClick?: () => void,
 * }} props
 */
export default function KitchenStaleAlertCell({ kind, summary, onClick }) {
  const icon = kind === 'drink' ? '🥤' : '🍜';
  const kindLabel = kind === 'drink' ? 'ドリンク' : 'フード';
  const active = summary.level !== 'ok' && summary.total > 0;
  const afterMin = summary.staleAfterMin ?? 5;
  const aria = active
    ? `${kindLabel}の出し忘れ注意：最長${summary.worstMin}分、${summary.staleCount}件が${afterMin}分以上未提供`
    : `${kindLabel}：${afterMin}分超の未提供はありません`;

  return (
    <button
      type="button"
      className={[
        'kitchen-live-cell',
        'kitchen-live-cell--stale',
        `kitchen-live-cell--stale-${summary.level}`,
        'kitchen-live-cell--tappable',
        active ? 'kitchen-live-cell--stale-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-label={aria}
    >
      <span className="kitchen-live-cell__stale-icon" aria-hidden>
        {icon}
      </span>
      <span className="kitchen-live-cell__label">出し忘れ</span>
      <strong className="kitchen-live-cell__value kitchen-live-cell__value--stale">
        {active ? summary.bucketLabel : '—'}
      </strong>
      {active ? (
        <span className="kitchen-live-cell__stale-badge" aria-hidden>
          {summary.staleCount}
        </span>
      ) : null}
      <span className="kitchen-live-cell__sub">{active ? `${kindLabel}・タップで一覧` : kindLabel}</span>
    </button>
  );
}
