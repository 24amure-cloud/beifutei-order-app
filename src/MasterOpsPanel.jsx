import React, { useEffect, useMemo, useState } from 'react';
import {
  DAILY_LEDGER_STORAGE_KEY,
  getLocalDateKey,
  loadDailyLedger,
  summarizeLedgerDay,
} from './dailyLedger.js';

/** 社長向け：本日の売上だけを大きく表示 */
export default function MasterOpsPanel({
  kitchenHref,
  showKitchenLink = true,
  onOpenLedger,
  onOpenCalendar,
}) {
  const [ledgerTick, setLedgerTick] = useState(0);

  useEffect(() => {
    const onUpd = () => setLedgerTick((x) => x + 1);
    const onStorage = (e) => {
      if (e.key === DAILY_LEDGER_STORAGE_KEY || e.key === null) onUpd();
    };
    window.addEventListener('beifutei-daily-ledger-updated', onUpd);
    window.addEventListener('beifutei-daily-ledger-synced', onUpd);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-daily-ledger-updated', onUpd);
      window.removeEventListener('beifutei-daily-ledger-synced', onUpd);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const { todayKey, daySum } = useMemo(() => {
    const { entries } = loadDailyLedger();
    const key = getLocalDateKey();
    return { todayKey: key, daySum: summarizeLedgerDay(entries, key) };
  }, [ledgerTick]);

  return (
    <section className="master-president-dashboard" aria-labelledby="president-today-title">
      <div className="master-president-dashboard__hero">
        <p className="master-president-dashboard__eyebrow" id="president-today-title">
          本日の売上（税込）
        </p>
        <p className="master-president-dashboard__total" aria-live="polite">
          <span className="master-president-dashboard__yen">￥</span>
          {daySum.grand.toLocaleString()}
        </p>
        <p className="master-president-dashboard__date">{todayKey}</p>
      </div>

      <div className="master-president-dashboard__stats">
        <div className="master-president-stat">
          <span className="master-president-stat__label">会計</span>
          <strong className="master-president-stat__value">{daySum.count}件</strong>
        </div>
        <div className="master-president-stat">
          <span className="master-president-stat__label">現金</span>
          <strong className="master-president-stat__value">￥{daySum.cash.toLocaleString()}</strong>
        </div>
        <div className="master-president-stat">
          <span className="master-president-stat__label">カード</span>
          <strong className="master-president-stat__value">￥{daySum.card.toLocaleString()}</strong>
        </div>
      </div>

      {daySum.count === 0 ? (
        <p className="master-president-dashboard__empty">
          まだ本日の会計がありません。厨房で会計が確定すると、ここに表示されます。
        </p>
      ) : null}

      <div className="master-president-dashboard__nav">
        {typeof onOpenLedger === 'function' && (
          <button type="button" className="master-president-nav-btn" onClick={onOpenLedger}>
            日計の詳細を見る
          </button>
        )}
        {typeof onOpenCalendar === 'function' && (
          <button type="button" className="master-president-nav-btn" onClick={onOpenCalendar}>
            売上カレンダーを見る
          </button>
        )}
        {showKitchenLink && kitchenHref ? (
          <a
            href={kitchenHref}
            className="master-president-nav-btn master-president-nav-btn--kitchen"
            target="_blank"
            rel="noopener noreferrer"
          >
            厨房画面を開く
          </a>
        ) : null}
      </div>
    </section>
  );
}
