import React, { useEffect, useMemo, useState } from 'react';
import {
  BUCKET_KEYS,
  BUCKET_LABELS,
  buildMonthCostLines,
  buildMonthSalesSummary,
  costLinesTotalPercent,
  entriesForMonth,
  expenseAmountsTotal,
} from './monthCloseAnalytics.js';
import { downloadAllMonthClosesCsv, downloadMonthCloseCsv } from './monthCloseCsvExport.js';
import { getMonthExpenseAmounts, MONTH_EXPENSE_STORAGE_KEY } from './monthExpenseStorage.js';
import { monthLabel, shiftMonthKey } from './monthNavHelpers.js';
import {
  MONTH_CLOSE_STORAGE_KEY,
  deleteMonthClose,
  getMonthClose,
  listMonthCloses,
  saveMonthClose,
} from './monthCloseStorage.js';
import {
  DAILY_LEDGER_STORAGE_KEY,
  getLocalDateKey,
  loadDailyLedger,
  loadLedgerSettings,
} from './dailyLedger.js';
import LedgerDataNotice from './LedgerDataNotice.jsx';

function fmtYen(n) {
  return `￥${Math.max(0, Math.round(Number(n) || 0)).toLocaleString()}`;
}

export default function MonthClosePanel() {
  const todayKey = getLocalDateKey();
  const [monthCursor, setMonthCursor] = useState(() => todayKey.slice(0, 7));
  const [tick, setTick] = useState(0);
  const [memo, setMemo] = useState('');
  const [savedList, setSavedList] = useState(() => listMonthCloses());
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    const refresh = () => {
      setTick((x) => x + 1);
      setSavedList(listMonthCloses());
    };
    const onStorage = (e) => {
      if (
        e.key === DAILY_LEDGER_STORAGE_KEY ||
        e.key === MONTH_CLOSE_STORAGE_KEY ||
        e.key === MONTH_EXPENSE_STORAGE_KEY ||
        e.key === null
      ) {
        refresh();
      }
    };
    window.addEventListener('beifutei-daily-ledger-updated', refresh);
    window.addEventListener('beifutei-daily-ledger-synced', refresh);
    window.addEventListener('beifutei-month-close-updated', refresh);
    window.addEventListener('beifutei-month-expenses-updated', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-daily-ledger-updated', refresh);
      window.removeEventListener('beifutei-daily-ledger-synced', refresh);
      window.removeEventListener('beifutei-month-close-updated', refresh);
      window.removeEventListener('beifutei-month-expenses-updated', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const entries = useMemo(() => loadDailyLedger().entries, [tick]);
  const monthEntries = useMemo(() => entriesForMonth(entries, monthCursor), [entries, monthCursor]);
  const summary = useMemo(() => buildMonthSalesSummary(monthEntries), [monthEntries]);
  const confirmed = useMemo(() => getMonthClose(monthCursor), [monthCursor, savedList, tick]);

  const expenseAmounts = useMemo(() => getMonthExpenseAmounts(monthCursor), [monthCursor, tick]);
  const cogsPercent = loadLedgerSettings().cogsPercent;

  const previewCostLines = useMemo(
    () => buildMonthCostLines(summary.grandTotal, cogsPercent, expenseAmounts),
    [summary.grandTotal, cogsPercent, expenseAmounts],
  );

  const costTotalPct = costLinesTotalPercent(previewCostLines);

  useEffect(() => {
    if (confirmed) return;
    setMemo('');
  }, [monthCursor, confirmed]);

  const onConfirm = () => {
    if (confirmed) {
      window.alert(`${monthLabel(monthCursor)}はすでに確定済みです。`);
      return;
    }
    if (monthEntries.length === 0) {
      if (!window.confirm('この月の会計データがありません。空のまま確定しますか？')) return;
    }
    const frozen = buildMonthCostLines(summary.grandTotal, cogsPercent, expenseAmounts);
    const msg = [
      `${monthLabel(monthCursor)}を確定します。`,
      `総売上 ${fmtYen(summary.grandTotal)}（会計 ${summary.checkoutCount} 件）`,
      '確定後はこの画面で編集できません。よろしいですか？',
    ].join('\n');
    if (!window.confirm(msg)) return;

    saveMonthClose({
      monthKey: monthCursor,
      confirmedAt: Date.now(),
      checkoutCount: summary.checkoutCount,
      grandTotal: summary.grandTotal,
      cashTotal: summary.cashTotal,
      cardTotal: summary.cardTotal,
      nhPlanTotal: summary.nhPlanTotal,
      foodTotal: summary.foodTotal,
      nhSharePct: summary.nhSharePct,
      foodSharePct: summary.foodSharePct,
      bucketGrand: summary.bucketGrand,
      bucketShares: summary.bucketShares,
      unclassifiedInBuckets: summary.unclassifiedInBuckets,
      costLines: frozen,
      memo: memo.trim(),
    });
    setSavedList(listMonthCloses());
    window.alert('月締めを保存しました。');
  };

  const display = confirmed
    ? {
        ...confirmed,
        costLines: confirmed.costLines,
        isLocked: true,
      }
    : {
        ...summary,
        costLines: previewCostLines,
        isLocked: false,
      };

  const bucketKeys = BUCKET_KEYS;

  return (
    <section className="month-close-panel master-card" aria-labelledby="month-close-title">
      <h2 id="month-close-title" className="master-card-title">
        月締め
      </h2>
      <p className="month-close-panel__lead">
        月間の売上と飲食店比率を確認し、1回の確定で保存します。ソフトクリーム・カフェドリンク・テイクアウトスイーツは日計と同じ集計です。
      </p>

      <LedgerDataNotice />

      <div className="month-close-nav">
        <button type="button" className="month-close-nav__btn" onClick={() => setMonthCursor(shiftMonthKey(monthCursor, -1))}>
          ← 前月
        </button>
        <strong className="month-close-nav__label">{monthLabel(monthCursor)}</strong>
        <button type="button" className="month-close-nav__btn" onClick={() => setMonthCursor(shiftMonthKey(monthCursor, 1))}>
          翌月 →
        </button>
      </div>

      {confirmed && (
        <p className="month-close-badge" role="status">
          この月は {new Date(confirmed.confirmedAt).toLocaleString('ja-JP')} に確定済みです
        </p>
      )}

      <div className="month-close-kpis">
        <div className="month-close-kpi month-close-kpi--hero">
          <span className="month-close-kpi__lab">月間総売上</span>
          <strong className="month-close-kpi__val">{fmtYen(display.grandTotal)}</strong>
        </div>
        <div className="month-close-kpi">
          <span className="month-close-kpi__lab">会計件数</span>
          <strong className="month-close-kpi__val">{display.checkoutCount}件</strong>
        </div>
        <div className="month-close-kpi">
          <span className="month-close-kpi__lab">現金</span>
          <strong className="month-close-kpi__val">{fmtYen(display.cashTotal)}</strong>
        </div>
        <div className="month-close-kpi">
          <span className="month-close-kpi__lab">カード</span>
          <strong className="month-close-kpi__val">{fmtYen(display.cardTotal)}</strong>
        </div>
      </div>

      <div className="month-close-block">
        <h3 className="month-close-block__h">飲食店としての比率</h3>
        <div className="month-close-ratio-grid">
          <div className="month-close-ratio">
            <span className="month-close-ratio__lab">飲み放題（NH）</span>
            <strong className="month-close-ratio__pct">
              {(display.nhSharePct ?? 0).toFixed(1)}%
            </strong>
            <span className="month-close-ratio__yen">{fmtYen(display.nhPlanTotal)}</span>
          </div>
          <div className="month-close-ratio">
            <span className="month-close-ratio__lab">フード等</span>
            <strong className="month-close-ratio__pct">
              {(display.foodSharePct ?? 0).toFixed(1)}%
            </strong>
            <span className="month-close-ratio__yen">{fmtYen(display.foodTotal)}</span>
          </div>
        </div>
      </div>

      <div className="month-close-block">
        <h3 className="month-close-block__h">ソフトクリーム・カフェドリンク・テイクアウトスイーツ</h3>
        <p className="month-close-block__hint">
          3カテゴリ合計 {fmtYen(display.bucketGrand)}（総売上の
          {display.grandTotal > 0
            ? ((display.bucketGrand / display.grandTotal) * 100).toFixed(1)
            : '0'}
          %）。ID未分類 {fmtYen(display.unclassifiedInBuckets ?? 0)}
        </p>
        <div className="owner-cal-buckets">
          {bucketKeys.map((key) => {
            const b = display.bucketShares[key];
            return (
              <div key={key} className="owner-cal-bucket">
                <span className="owner-cal-bucket__lab">{BUCKET_LABELS[key]}</span>
                <strong className="owner-cal-bucket__val">{fmtYen(b.revenue)}</strong>
                <span className="owner-cal-bucket__sub">
                  構成比 {b.sharePct.toFixed(1)}% · 総売上比 {b.sharePctOfGrand.toFixed(1)}% · {b.lineCount} 行
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="month-close-block">
        <h3 className="month-close-block__h">費用</h3>
        <p className="month-close-block__hint">
          原価は日計の店舗設定（％）。人件費・家賃などは「経費入力」タブの金額です。売上比合計{' '}
          {costTotalPct.toFixed(1)}%
          {!display.isLocked && costTotalPct > 100 && (
            <span className="month-close-warn"> ※100%を超えています</span>
          )}
        </p>
        <div className="month-close-cost-table">
          {display.costLines.map((row) => (
            <div key={row.key} className="month-close-cost-row">
              <span className="month-close-cost-row__label">{row.label}</span>
              <span className="month-close-cost-row__pct">
                {row.inputMode === 'percent'
                  ? `${row.percent.toFixed(1)}%`
                  : `${row.percent.toFixed(1)}%`}
              </span>
              {row.inputMode === 'amount' && !display.isLocked ? (
                <span className="month-close-cost-row__src">経費入力</span>
              ) : null}
              <strong className="month-close-cost-row__amt">{fmtYen(row.amountYen)}</strong>
            </div>
          ))}
        </div>
        {!display.isLocked && expenseAmountsTotal(expenseAmounts) === 0 && (
          <p className="month-close-block__hint month-close-block__hint--warn">
            経費が未入力です。「経費入力」タブで人件費などを登録してください。
          </p>
        )}
        {!display.isLocked && (
          <label className="month-close-memo">
            <span>メモ（確定時に保存）</span>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：イベント週あり、人件費は概算"
            />
          </label>
        )}
        {display.isLocked && display.memo && (
          <p className="month-close-memo-read">メモ：{display.memo}</p>
        )}
      </div>

      <div className="month-close-actions">
        {!display.isLocked ? (
          <button type="button" className="master-btn master-btn--primary" onClick={onConfirm}>
            この月を確定して保存
          </button>
        ) : (
          <button
            type="button"
            className="master-btn"
            onClick={() => downloadMonthCloseCsv(confirmed)}
          >
            この月のCSVをダウンロード
          </button>
        )}
        {display.isLocked && (
          <button
            type="button"
            className="master-btn master-btn--danger"
            onClick={() => {
              if (
                !window.confirm(
                  `${monthLabel(monthCursor)}の確定データを削除します。よろしいですか？`,
                )
              ) {
                return;
              }
              deleteMonthClose(monthCursor);
              setSavedList(listMonthCloses());
            }}
          >
            確定を取り消し（削除）
          </button>
        )}
      </div>

      <div className="month-close-list">
        <div className="month-close-list__head">
          <h3 className="month-close-block__h">確定済み一覧</h3>
          {savedList.length > 0 && (
            <button
              type="button"
              className="master-btn master-btn--small"
              onClick={() => downloadAllMonthClosesCsv(savedList)}
            >
              一覧CSV
            </button>
          )}
        </div>
        {savedList.length === 0 ? (
          <p className="master-ledger-empty">まだ確定した月がありません</p>
        ) : (
          <ul className="month-close-list__ul">
            {savedList.map((r) => {
              const open = expandedKey === r.monthKey;
              return (
                <li key={r.monthKey} className="month-close-list__item">
                  <button
                    type="button"
                    className="month-close-list__sum"
                    onClick={() => setExpandedKey(open ? null : r.monthKey)}
                  >
                    <span>{monthLabel(r.monthKey)}</span>
                    <span>{fmtYen(r.grandTotal)}</span>
                    <span>{r.checkoutCount}件</span>
                    <span className="month-close-list__date">
                      {new Date(r.confirmedAt).toLocaleDateString('ja-JP')}
                    </span>
                  </button>
                  {open && (
                    <div className="month-close-list__detail">
                      <p>
                        ソフト {fmtYen(r.bucketShares?.softcream_fruit?.revenue ?? 0)} / カフェ{' '}
                        {fmtYen(r.bucketShares?.cafe_drink?.revenue ?? 0)} / テイクアウト{' '}
                        {fmtYen(r.bucketShares?.takeout_sweets?.revenue ?? 0)}
                      </p>
                      <p>
                        NH {(r.nhSharePct ?? 0).toFixed(1)}% · フード {(r.foodSharePct ?? 0).toFixed(1)}%
                      </p>
                      <button
                        type="button"
                        className="master-btn master-btn--small"
                        onClick={() => {
                          setMonthCursor(r.monthKey);
                          setExpandedKey(r.monthKey);
                        }}
                      >
                        この月を表示
                      </button>
                      <button
                        type="button"
                        className="master-btn master-btn--small"
                        onClick={() => downloadMonthCloseCsv(r)}
                      >
                        CSV
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
