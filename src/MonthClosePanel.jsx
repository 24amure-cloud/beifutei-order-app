import React, { useEffect, useMemo, useState } from 'react';
import {
  BUCKET_KEYS,
  BUCKET_LABELS,
  SWEETS_COST_KEY,
  buildMonthCostLines,
  buildMonthSalesSummary,
  costLinesTotalPercent,
  entriesForMonth,
  expenseAmountsTotal,
  listMonthBucketDetailLines,
  sumSweetsRevenue,
} from './monthCloseAnalytics.js';
import { downloadAllMonthClosesCsv, downloadMonthCloseCsv } from './monthCloseCsvExport.js';
import {
  getMonthCostPercents,
  getMonthExpenseAmounts,
  MONTH_EXPENSE_STORAGE_KEY,
  saveMonthCostPercents,
} from './monthExpenseStorage.js';
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

function fmtDateKey(dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return dateKey || '—';
  return `${Number(m[2])}/${Number(m[3])}`;
}

export default function MonthClosePanel() {
  const todayKey = getLocalDateKey();
  const [monthCursor, setMonthCursor] = useState(() => todayKey.slice(0, 7));
  const [tick, setTick] = useState(0);
  const [memo, setMemo] = useState('');
  const [sweetsPctInput, setSweetsPctInput] = useState('');
  const [savedList, setSavedList] = useState(() => listMonthCloses());
  const [expandedKey, setExpandedKey] = useState(null);
  const [detailBucketKey, setDetailBucketKey] = useState(null);

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
  const sweetsBaseYen = useMemo(
    () => sumSweetsRevenue(summary.bucketShares),
    [summary.bucketShares],
  );
  const sweetsPercent = Math.min(
    100,
    Math.max(0, Number(String(sweetsPctInput).replace(/,/g, '')) || 0),
  );

  const previewCostLines = useMemo(
    () =>
      buildMonthCostLines(summary.grandTotal, cogsPercent, expenseAmounts, {
        sweetsPercent,
        sweetsBaseYen,
      }),
    [summary.grandTotal, cogsPercent, expenseAmounts, sweetsPercent, sweetsBaseYen],
  );

  useEffect(() => {
    if (confirmed) return;
    setMemo('');
    const pct = getMonthCostPercents(monthCursor).sweets;
    setSweetsPctInput(pct > 0 ? String(pct) : '');
  }, [monthCursor, confirmed]);

  const persistSweetsPercent = (raw) => {
    if (confirmed) return;
    const pct = Math.min(100, Math.max(0, Number(String(raw).replace(/,/g, '')) || 0));
    saveMonthCostPercents(monthCursor, { ...getMonthCostPercents(monthCursor), sweets: pct });
  };

  const onConfirm = () => {
    if (confirmed) {
      window.alert(`${monthLabel(monthCursor)}はすでに確定済みです。`);
      return;
    }
    if (monthEntries.length === 0) {
      if (!window.confirm('この月の会計データがありません。空のまま確定しますか？')) return;
    }
    persistSweetsPercent(sweetsPctInput);
    const frozen = buildMonthCostLines(summary.grandTotal, cogsPercent, expenseAmounts, {
      sweetsPercent,
      sweetsBaseYen,
    });
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

  const costTotalPct = costLinesTotalPercent(
    display.costLines || [],
    display.grandTotal ?? summary.grandTotal,
  );

  const bucketKeys = BUCKET_KEYS;

  const detailLines = useMemo(() => {
    if (!detailBucketKey) return [];
    return listMonthBucketDetailLines(monthEntries, detailBucketKey);
  }, [detailBucketKey, monthEntries]);

  const detailTotal = useMemo(
    () => detailLines.reduce((s, ln) => s + Math.max(0, Number(ln.price) || 0), 0),
    [detailLines],
  );

  useEffect(() => {
    setDetailBucketKey(null);
  }, [monthCursor]);

  if (detailBucketKey) {
    const title = BUCKET_LABELS[detailBucketKey] || detailBucketKey;
    return (
      <section className="month-close-panel master-card month-close-bucket-detail" aria-labelledby="month-close-bucket-detail-title">
        <button
          type="button"
          className="month-close-bucket-detail__back"
          onClick={() => setDetailBucketKey(null)}
        >
          ← 月締めに戻る
        </button>
        <h2 id="month-close-bucket-detail-title" className="master-card-title">
          {title} 明細
        </h2>
        <p className="month-close-panel__lead">
          {monthLabel(monthCursor)} · {detailLines.length} 行 · 合計 {fmtYen(detailTotal)}
        </p>
        {detailLines.length === 0 ? (
          <p className="master-ledger-empty">このカテゴリの明細行はありません</p>
        ) : (
          <div className="month-close-bucket-detail__table-wrap">
            <table className="month-close-bucket-detail__table">
              <thead>
                <tr>
                  <th scope="col">日付</th>
                  <th scope="col">品目</th>
                  <th scope="col">値段</th>
                </tr>
              </thead>
              <tbody>
                {detailLines.map((ln, i) => (
                  <tr key={`${ln.dateKey}-${ln.itemId}-${i}`}>
                    <td className="month-close-bucket-detail__date">{fmtDateKey(ln.dateKey)}</td>
                    <td className="month-close-bucket-detail__name">{ln.name}</td>
                    <td className="month-close-bucket-detail__price">{fmtYen(ln.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="month-close-panel master-card" aria-labelledby="month-close-title">
      <h2 id="month-close-title" className="master-card-title">
        月締め
      </h2>
      <p className="month-close-panel__lead">
        月間の売上と飲食店比率を確認し、1回の確定で保存します。メニュー別内訳は総売上と一致する分類です。
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
        <h3 className="month-close-block__h">メニュー別売上</h3>
        <p className="month-close-block__hint">
          分類合計 {fmtYen(display.bucketGrand)}（総売上の
          {display.grandTotal > 0
            ? ((display.bucketGrand / display.grandTotal) * 100).toFixed(1)
            : '0'}
          %）
          {(display.unclassifiedInBuckets ?? 0) > 0
            ? ` · 差額 ${fmtYen(display.unclassifiedInBuckets)}`
            : ' · 総売上と一致'}
          {' · '}
          カテゴリをタップすると明細（日付・品目・値段）を表示します
        </p>
        <div className="owner-cal-buckets">
          {bucketKeys.filter((key) => (display.bucketShares[key]?.revenue ?? 0) > 0).map((key) => {
            const b = display.bucketShares[key];
            return (
              <button
                key={key}
                type="button"
                className="owner-cal-bucket owner-cal-bucket--tap"
                onClick={() => setDetailBucketKey(key)}
              >
                <span className="owner-cal-bucket__lab">{BUCKET_LABELS[key]}</span>
                <strong className="owner-cal-bucket__val">{fmtYen(b.revenue)}</strong>
                <span className="owner-cal-bucket__sub">
                  構成比 {b.sharePct.toFixed(1)}% · 総売上比 {b.sharePctOfGrand.toFixed(1)}% · {b.lineCount}{' '}
                  行
                </span>
                <span className="owner-cal-bucket__go">明細を見る →</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="month-close-block">
        <h3 className="month-close-block__h">費用</h3>
        <p className="month-close-block__hint">
          原価は日計の店舗設定（％）。スイーツはソフト・カフェ・テイクアウトスイーツ合算売上への％。人件費・家賃などは「経費入力」タブの金額です。売上比合計{' '}
          {costTotalPct.toFixed(1)}%
          {!display.isLocked && costTotalPct > 100 && (
            <span className="month-close-warn"> ※100%を超えています</span>
          )}
        </p>
        <div className="month-close-cost-table">
          {display.costLines.map((row) => {
            const isSweets = row.key === SWEETS_COST_KEY;
            const sweetsBase = isSweets
              ? Math.max(0, Number(row.baseYen) || (display.isLocked ? 0 : sweetsBaseYen))
              : 0;
            return (
              <div
                key={row.key}
                className={`month-close-cost-row${isSweets ? ' month-close-cost-row--sweets' : ''}`}
              >
                <div className="month-close-cost-row__main">
                  <span className="month-close-cost-row__label">{row.label}</span>
                  {isSweets ? (
                    <span className="month-close-cost-row__base">
                      対象売上（ソフト＋カフェ＋TO） {fmtYen(sweetsBase)}
                    </span>
                  ) : null}
                </div>
                {isSweets && !display.isLocked ? (
                  <label className="month-close-cost-row__pct-in">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      inputMode="decimal"
                      value={sweetsPctInput}
                      onChange={(e) => setSweetsPctInput(e.target.value)}
                      onBlur={(e) => persistSweetsPercent(e.target.value)}
                      placeholder="0"
                      aria-label="スイーツ費用％"
                    />
                    <span>%</span>
                  </label>
                ) : (
                  <span className="month-close-cost-row__pct">
                    {row.inputMode === 'percent_on_sweets'
                      ? `${Number(row.percent || 0).toFixed(1)}%（対スイーツ）`
                      : `${Number(row.percent || 0).toFixed(1)}%`}
                  </span>
                )}
                {row.inputMode === 'amount' && !display.isLocked ? (
                  <span className="month-close-cost-row__src">経費入力</span>
                ) : isSweets && !display.isLocked ? (
                  <span className="month-close-cost-row__src">％入力</span>
                ) : (
                  <span className="month-close-cost-row__src month-close-cost-row__src--empty" />
                )}
                <strong className="month-close-cost-row__amt">{fmtYen(row.amountYen)}</strong>
              </div>
            );
          })}
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
                        NH {fmtYen(r.bucketShares?.nomihodai_plan?.revenue ?? r.nhPlanTotal ?? 0)} / 油そば{' '}
                        {fmtYen(r.bucketShares?.aburasoba_takeout?.revenue ?? 0)} / ソフト{' '}
                        {fmtYen(r.bucketShares?.softcream_fruit?.revenue ?? 0)} / カフェ{' '}
                        {fmtYen(r.bucketShares?.cafe_drink?.revenue ?? 0)} / テイクアウト{' '}
                        {fmtYen(r.bucketShares?.takeout_sweets?.revenue ?? 0)} / ドリンク{' '}
                        {fmtYen(r.bucketShares?.drink?.revenue ?? 0)}
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
