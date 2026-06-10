import React, { useEffect, useMemo, useState } from 'react';
import { buildDailyReport } from './dailyLedgerAnalytics.js';
import {
  DAILY_LEDGER_DELETED_IDS_KEY,
  DAILY_LEDGER_STORAGE_KEY,
  LEDGER_SETTINGS_KEY,
  formatLedgerPaymentJa,
  getLocalDateKey,
  loadDailyLedger,
  loadLedgerSettings,
  summarizeLedgerDay,
} from './dailyLedger.js';
import { summarizeLedgerCategoryBuckets } from './ledgerCategoryBuckets.js';
import LedgerDataNotice from './LedgerDataNotice.jsx';
import LedgerEntryDeleteButton from './LedgerEntryDeleteButton.jsx';
import LedgerEntryEditDateButton from './LedgerEntryEditDateButton.jsx';

const WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];

function fmtYen(n) {
  return `￥${Math.max(0, Math.round(Number(n) || 0)).toLocaleString()}`;
}

function fmtClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

/** @returns {{ year: number, month: number }} month 1–12 */
function parseMonthKey(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  if (!m) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildMonthCells(year, month) {
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const pad = first.getDay();
  const cells = [];
  for (let i = 0; i < pad; i += 1) cells.push({ kind: 'pad' });
  for (let d = 1; d <= lastDay; d += 1) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ kind: 'day', d, dateKey });
  }
  while (cells.length % 7 !== 0) cells.push({ kind: 'pad' });
  return cells;
}

function sumDayGrand(entries, dateKey) {
  return summarizeLedgerDay(entries, dateKey).grand;
}

export default function OwnerSalesCalendar() {
  const todayKey = getLocalDateKey();
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = parseMonthKey(todayKey.slice(0, 7));
    return monthKey(t.year, t.month);
  });
  const [selectedKey, setSelectedKey] = useState(() => todayKey);
  const [tick, setTick] = useState(0);
  const [cogsPercent] = useState(() => loadLedgerSettings().cogsPercent);

  useEffect(() => {
    const onLed = () => setTick((x) => x + 1);
    const onStorage = (e) => {
      if (
        e.key === DAILY_LEDGER_STORAGE_KEY ||
        e.key === DAILY_LEDGER_DELETED_IDS_KEY ||
        e.key === LEDGER_SETTINGS_KEY ||
        e.key === null
      ) {
        onLed();
      }
    };
    window.addEventListener('beifutei-daily-ledger-updated', onLed);
    window.addEventListener('beifutei-daily-ledger-synced', onLed);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-daily-ledger-updated', onLed);
      window.removeEventListener('beifutei-daily-ledger-synced', onLed);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const { year, month } = useMemo(() => parseMonthKey(monthCursor), [monthCursor]);
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const { entries, dayTotalsInMonth } = useMemo(() => {
    const { entries: all } = loadDailyLedger();
    const prefix = monthCursor;
    const map = new Map();
    for (const e of all) {
      if (!e.dateKey || !String(e.dateKey).startsWith(prefix)) continue;
      const g = Math.max(0, Number(e.total) || 0);
      map.set(e.dateKey, (map.get(e.dateKey) || 0) + g);
    }
    return { entries: all, dayTotalsInMonth: map };
  }, [monthCursor, tick]);

  const selectedDayEntries = useMemo(
    () => entries.filter((e) => e.dateKey === selectedKey),
    [entries, selectedKey, tick]
  );

  const daySum = useMemo(() => summarizeLedgerDay(entries, selectedKey), [entries, selectedKey, tick]);
  const report = useMemo(
    () => buildDailyReport(entries, selectedKey, { cogsPercent }),
    [entries, selectedKey, cogsPercent, tick]
  );
  const buckets = useMemo(() => summarizeLedgerCategoryBuckets(selectedDayEntries), [selectedDayEntries]);

  const shiftMonth = (delta) => {
    let y = year;
    let m = month + delta;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setMonthCursor(monthKey(y, m));
  };

  const monthLabel = `${year}年${month}月`;

  return (
    <section className="master-card master-card--owner-calendar">
      <div className="master-card-head master-card-head--ledger">
        <div>
          <h2 className="master-card-title">売上カレンダー</h2>
          <p className="master-page-lead master-page-lead--compact">
            カレンダーで日を選ぶと、その日の売上が確認できます。
          </p>
        </div>
        <div className="owner-cal-nav">
          <button type="button" className="owner-cal-nav__btn" onClick={() => shiftMonth(-1)} aria-label="前月">
            ‹
          </button>
          <span className="owner-cal-nav__label">{monthLabel}</span>
          <button type="button" className="owner-cal-nav__btn" onClick={() => shiftMonth(1)} aria-label="翌月">
            ›
          </button>
        </div>
      </div>

      <LedgerDataNotice />

      <div className="owner-cal-layout">
        <div className="owner-cal-grid-wrap">
          <div className="owner-cal-weekdays">
            {WEEK_JA.map((w) => (
              <div key={w} className="owner-cal-weekdays__cell">
                {w}
              </div>
            ))}
          </div>
          <div className="owner-cal-grid" role="grid" aria-label={`${monthLabel}の売上`}>
            {cells.map((cell, idx) => {
              if (cell.kind === 'pad') {
                return <div key={`pad-${idx}`} className="owner-cal-cell owner-cal-cell--pad" />;
              }
              const total = dayTotalsInMonth.get(cell.dateKey) || 0;
              const isSelected = cell.dateKey === selectedKey;
              const isToday = cell.dateKey === todayKey;
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  className={[
                    'owner-cal-cell',
                    isSelected ? 'owner-cal-cell--selected' : '',
                    isToday ? 'owner-cal-cell--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedKey(cell.dateKey)}
                  aria-pressed={isSelected}
                  aria-label={`${cell.dateKey} 売上${total > 0 ? fmtYen(total) : 'なし'}`}
                >
                  <span className="owner-cal-cell__d">{cell.d}</span>
                  <span className="owner-cal-cell__yen">{total > 0 ? fmtYen(total) : '—'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="owner-cal-detail">
          <h3 className="owner-cal-detail__title">{selectedKey} の売上</h3>

          <div className="owner-cal-kpis">
            <div className="owner-cal-kpi owner-cal-kpi--hero">
              <span className="owner-cal-kpi__lab">当日合計</span>
              <strong className="owner-cal-kpi__val">{fmtYen(daySum.grand)}</strong>
            </div>
            <div className="owner-cal-kpi">
              <span className="owner-cal-kpi__lab">会計件数</span>
              <strong className="owner-cal-kpi__val">{daySum.count}件</strong>
            </div>
            <div className="owner-cal-kpi">
              <span className="owner-cal-kpi__lab">現金</span>
              <strong className="owner-cal-kpi__val">{fmtYen(daySum.cash)}</strong>
            </div>
            <div className="owner-cal-kpi">
              <span className="owner-cal-kpi__lab">カード</span>
              <strong className="owner-cal-kpi__val">{fmtYen(daySum.card)}</strong>
            </div>
            <div className="owner-cal-kpi">
              <span className="owner-cal-kpi__lab">NH売上</span>
              <strong className="owner-cal-kpi__val">{fmtYen(report.nhPlanTotal)}</strong>
            </div>
            <div className="owner-cal-kpi">
              <span className="owner-cal-kpi__lab">フード等</span>
              <strong className="owner-cal-kpi__val">{fmtYen(report.foodTotal)}</strong>
            </div>
          </div>

          <div className="owner-cal-block">
            <h4 className="owner-cal-block__h">ソフトクリーム・カフェドリンク・テイクアウト内訳</h4>
            <p className="owner-cal-block__hint">
              会計伝票の品目 ID から集計（cafe-*／fr-*／ts-*）。過去データに itemId が無い行は含まれません。
            </p>
            <div className="owner-cal-buckets">
              <div className="owner-cal-bucket">
                <span className="owner-cal-bucket__lab">ソフトクリーム</span>
                <strong className="owner-cal-bucket__val">{fmtYen(buckets.softcream_fruit.revenue)}</strong>
                <span className="owner-cal-bucket__sub">{buckets.softcream_fruit.lineCount} 行</span>
              </div>
              <div className="owner-cal-bucket">
                <span className="owner-cal-bucket__lab">カフェドリンク</span>
                <strong className="owner-cal-bucket__val">{fmtYen(buckets.cafe_drink.revenue)}</strong>
                <span className="owner-cal-bucket__sub">{buckets.cafe_drink.lineCount} 行</span>
              </div>
              <div className="owner-cal-bucket">
                <span className="owner-cal-bucket__lab">テイクアウトスイーツ</span>
                <strong className="owner-cal-bucket__val">{fmtYen(buckets.takeout_sweets.revenue)}</strong>
                <span className="owner-cal-bucket__sub">{buckets.takeout_sweets.lineCount} 行</span>
              </div>
            </div>
            <details className="owner-cal-bucket-lines">
              <summary>カテゴリ別の明細行を表示</summary>
              {(['softcream_fruit', 'cafe_drink', 'takeout_sweets']).map((key) => {
                const b = buckets[key];
                const title =
                  key === 'softcream_fruit'
                    ? 'ソフトクリーム'
                    : key === 'cafe_drink'
                      ? 'カフェドリンク'
                      : 'テイクアウトスイーツ';
                if (b.lines.length === 0) {
                  return (
                    <p key={key} className="owner-cal-bucket-lines__empty">
                      {title}：該当行なし
                    </p>
                  );
                }
                return (
                  <div key={key} className="owner-cal-bucket-lines__group">
                    <div className="owner-cal-bucket-lines__head">{title}</div>
                    <ul className="owner-cal-bucket-lines__ul">
                      {b.lines.slice(0, 80).map((ln, i) => (
                        <li key={`${key}-${i}-${ln.itemId}`}>
                          <span className="owner-cal-bucket-lines__name">{ln.name}</span>
                          <span className="owner-cal-bucket-lines__price">{fmtYen(ln.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </details>
          </div>

          <div className="owner-cal-block">
            <h4 className="owner-cal-block__h">伝票一覧（会計確定）</h4>
            <p className="owner-cal-block__hint">
              各行の「日時」「削除」で修正できます（オーナー用パスワード・初期値 1211）。
            </p>
            {selectedDayEntries.length === 0 ? (
              <p className="master-ledger-empty">この日の会計記録はありません</p>
            ) : (
              <div className="owner-cal-slips">
                {[...selectedDayEntries]
                  .sort((a, b) => (Number(b.recordedAt) || 0) - (Number(a.recordedAt) || 0))
                  .map((e) => (
                    <details key={e.id} className="owner-cal-slip">
                      <summary className="owner-cal-slip__sum">
                        <span className="owner-cal-slip__time">{fmtClock(e.recordedAt)}</span>
                        <span className="owner-cal-slip__table">卓{e.tableLabel}</span>
                        <span className="owner-cal-slip__pay">{formatLedgerPaymentJa(e.payment)}</span>
                        <span className="owner-cal-slip__total">{fmtYen(e.total)}</span>
                      </summary>
                      <div className="owner-cal-slip__memo">
                        {e.checkoutMemo ? <span>{e.checkoutMemo}</span> : <span className="owner-cal-slip__memo--empty">メモなし</span>}
                      </div>
                      <div className="owner-cal-slip__actions master-ledger-act">
                        <div className="master-ledger-act__btns">
                          <LedgerEntryEditDateButton
                            entry={e}
                            variant="master"
                            onUpdated={() => setTick((x) => x + 1)}
                          />
                          <LedgerEntryDeleteButton
                            entry={e}
                            variant="master"
                            onDeleted={() => setTick((x) => x + 1)}
                          />
                        </div>
                      </div>
                      <ul className="owner-cal-slip__lines">
                        {(e.lines || []).map((ln, i) => (
                          <li key={`${e.id}-ln-${i}`}>
                            <span className="owner-cal-slip__kind">
                              {ln.kind === 'nh'
                                ? 'NH'
                                : ln.kind === 'nh_extra'
                                  ? '別料金'
                                  : ln.kind === 'alcohol_charge'
                                    ? 'CH'
                                    : '通常'}
                            </span>
                            <span className="owner-cal-slip__name">{ln.name}</span>
                            {(ln.kind === 'normal' || ln.kind === 'nh_extra' || ln.kind === 'alcohol_charge') &&
                            ln.price != null ? (
                              <span className="owner-cal-slip__price">{fmtYen(ln.price)}</span>
                            ) : (
                              <span className="owner-cal-slip__price">—</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
              </div>
            )}
          </div>

          <div className="owner-cal-block">
            <h4 className="owner-cal-block__h">日計サマリー（卓別・時間帯）</h4>
            <p className="owner-cal-block__hint">「日計管理」と同じ集計ロジックです。</p>
            {report.checkoutCount === 0 ? (
              <p className="master-ledger-empty">データなし</p>
            ) : (
              <>
                <div className="owner-cal-mini-tables">
                  <div className="owner-cal-mini-block">
                    <div className="owner-cal-mini-block__t">卓別売上</div>
                    <div className="master-ledger-table-wrap">
                      <table className="master-ledger-table master-ledger-table--compact">
                        <thead>
                          <tr>
                            <th>卓</th>
                            <th className="master-ledger-num">回数</th>
                            <th className="master-ledger-num">計</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.byTable.slice(0, 12).map((row) => (
                            <tr key={row.tableLabel}>
                              <td>{row.tableLabel}</td>
                              <td className="master-ledger-num">{row.checkouts}</td>
                              <td className="master-ledger-num">{fmtYen(row.sales)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="owner-cal-mini-block">
                    <div className="owner-cal-mini-block__t">時間帯別</div>
                    <div className="master-ledger-table-wrap">
                      <table className="master-ledger-table master-ledger-table--compact">
                        <thead>
                          <tr>
                            <th>時</th>
                            <th className="master-ledger-num">件</th>
                            <th className="master-ledger-num">売上</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.byHour
                            .filter((s) => s.checkouts > 0 || s.sales > 0)
                            .map((slot) => (
                              <tr key={slot.hour}>
                                <td>{String(slot.hour).padStart(2, '0')}時台</td>
                                <td className="master-ledger-num">{slot.checkouts}</td>
                                <td className="master-ledger-num">{fmtYen(slot.sales)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="master-footnote master-footnote--inline">
        ※スタッフ画面と同じ端末・同じドメインで会計するとここに溜まります。別端末では共有されません。
      </p>
    </section>
  );
}
