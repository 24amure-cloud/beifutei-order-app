import React, { useEffect, useMemo, useState } from 'react';
import { buildDailyReport } from './dailyLedgerAnalytics.js';
import { downloadDailyLedgerCsvForDate } from './dailyLedgerCsvExport.js';
import LedgerDriveSetupPanel from './LedgerDriveSetupPanel.jsx';
import LedgerDataNotice from './LedgerDataNotice.jsx';
import LedgerDemographicsCards from './LedgerDemographicsCards.jsx';
import LedgerEntryDeleteButton from './LedgerEntryDeleteButton.jsx';
import LedgerEntryEditDateButton from './LedgerEntryEditDateButton.jsx';
import {
  DAILY_LEDGER_STORAGE_KEY,
  LEDGER_SETTINGS_KEY,
  formatLedgerPaymentJa,
  getLocalDateKey,
  loadDailyLedger,
  loadLedgerSettings,
  saveLedgerSettings,
} from './dailyLedger.js';

function fmtCheckoutClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function fmtHourRange(h) {
  return `${String(h).padStart(2, '0')}:00〜${String(h).padStart(2, '0')}:59`;
}

export default function DailyLedgerDashboard() {
  const [dateKey, setDateKey] = useState(() => getLocalDateKey());
  const [tick, setTick] = useState(0);
  const [cogsPercent, setCogsPercent] = useState(() => loadLedgerSettings().cogsPercent);

  useEffect(() => {
    const onLed = () => setTick((x) => x + 1);
    const onSt = () => setCogsPercent(loadLedgerSettings().cogsPercent);
    const onStorage = (e) => {
      if (e.key === DAILY_LEDGER_STORAGE_KEY || e.key === LEDGER_SETTINGS_KEY || e.key === null) {
        onLed();
        if (e.key === LEDGER_SETTINGS_KEY || e.key === null) onSt();
      }
    };
    window.addEventListener('beifutei-daily-ledger-updated', onLed);
    window.addEventListener('beifutei-ledger-settings-updated', onSt);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-daily-ledger-updated', onLed);
      window.removeEventListener('beifutei-ledger-settings-updated', onSt);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const report = useMemo(() => {
    const { entries } = loadDailyLedger();
    return buildDailyReport(entries, dateKey, { cogsPercent });
  }, [dateKey, cogsPercent, tick]);

  const activeHours = useMemo(() => report.byHour.filter((s) => s.checkouts > 0 || s.sales > 0), [report.byHour]);

  const onCogsBlur = () => {
    const saved = saveLedgerSettings({ cogsPercent });
    setCogsPercent(saved.cogsPercent);
  };

  return (
    <section className="master-card master-card--ledger">
      <div className="master-card-head master-card-head--ledger">
        <div>
          <h2 className="master-card-title">日計</h2>
          <p className="master-page-lead master-page-lead--compact">
            日付を選ぶと、その日の会計一覧と売上内訳が見られます。
          </p>
        </div>
        <div className="master-ledger-head-tools">
          <label className="master-ledger-date">
            <span>対象日</span>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value || getLocalDateKey())}
            />
          </label>
          <button
            type="button"
            className="master-btn master-btn--secondary master-btn--small"
            onClick={() => downloadDailyLedgerCsvForDate(dateKey)}
          >
            CSVで保存
          </button>
        </div>
      </div>

      <LedgerDataNotice />
      <LedgerDriveSetupPanel />

      <div className="master-ledger-kpi-grid">
        <div className="master-ledger-kpi master-ledger-kpi--hero">
          <span className="master-ledger-kpi__label">総売上（税込）</span>
          <strong className="master-ledger-kpi__value">￥{report.grandTotal.toLocaleString()}</strong>
        </div>
        <div className="master-ledger-kpi">
          <span className="master-ledger-kpi__label">会計件数</span>
          <strong className="master-ledger-kpi__value">{report.checkoutCount}件</strong>
        </div>
        <div className="master-ledger-kpi">
          <span className="master-ledger-kpi__label">飲み放題売上</span>
          <strong className="master-ledger-kpi__value">￥{report.nhPlanTotal.toLocaleString()}</strong>
        </div>
        <div className="master-ledger-kpi">
          <span className="master-ledger-kpi__label">フード等売上</span>
          <strong className="master-ledger-kpi__value">￥{report.foodTotal.toLocaleString()}</strong>
        </div>
        <div className="master-ledger-kpi">
          <span className="master-ledger-kpi__label">現金 / カード</span>
          <strong className="master-ledger-kpi__value">
            ￥{report.cashTotal.toLocaleString()} / ￥{report.cardTotal.toLocaleString()}
          </strong>
        </div>
        <div className="master-ledger-kpi">
          <span className="master-ledger-kpi__label">延長率（飲み放題会計）</span>
          <strong className="master-ledger-kpi__value">
            {report.nhSessionCount > 0 && report.extensionRatePct != null
              ? `${report.extensionRatePct.toFixed(1)}%（${report.nhExtendedCount}/${report.nhSessionCount}件）`
              : '—'}
          </strong>
        </div>
        <div className="master-ledger-kpi">
          <span className="master-ledger-kpi__label">平均滞在（飲み放題・会計時）</span>
          <strong className="master-ledger-kpi__value">
            {report.avgStayMin != null ? `${report.avgStayMin.toFixed(1)} 分` : '—'}
          </strong>
        </div>
        <div className="master-ledger-kpi master-ledger-kpi--cost">
          <span className="master-ledger-kpi__label">原価率（店舗設定）</span>
          <div className="master-ledger-cogs">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="master-ledger-cogs-input"
              value={cogsPercent}
              onChange={(e) => setCogsPercent(Number(e.target.value))}
              onBlur={onCogsBlur}
            />
            <span>%</span>
          </div>
          <p className="master-ledger-kpi__sub">
            推定原価 ￥{report.costYen.toLocaleString()} ／ 粗利 ￥{report.grossProfit.toLocaleString()}
          </p>
        </div>
      </div>

      <LedgerDemographicsCards
        partyRatio={report.partyRatio}
        localeRatio={report.localeRatio}
        genderRatio={report.genderRatio}
        nhSessionCount={report.nhSessionCount}
      />

      <div className="master-ledger-block master-ledger-block--checkout-log">
        <h3 className="master-ledger-block__title">会計一覧（卓メモ）</h3>
        <p className="master-ledger-block__hint">
          テーブル状況で入力したメモが会計確定時に日計へ記録されます（テーブル番号の横に表示）。
          「日時」「削除」はオーナー用パスワード（初期値 1211）で修正・削除できます。
        </p>
        {report.checkoutRows.length === 0 ? (
          <p className="master-ledger-empty">データなし</p>
        ) : (
          <div className="master-ledger-table-wrap">
            <table className="master-ledger-table">
              <thead>
                <tr>
                  <th>時刻</th>
                  <th>卓・メモ</th>
                  <th>支払</th>
                  <th className="master-ledger-num">金額（税込）</th>
                  <th className="master-ledger-act">操作</th>
                </tr>
              </thead>
              <tbody>
                {report.checkoutRows.map((row) => (
                  <tr key={row.id}>
                    <td>{fmtCheckoutClock(row.recordedAt)}</td>
                    <td className="master-ledger-desk-memo">
                      <span className="master-ledger-desk-memo__table">
                        テーブル{row.tableLabel}
                      </span>
                      {row.checkoutMemo ? (
                        <span className="master-ledger-desk-memo__text">{row.checkoutMemo}</span>
                      ) : null}
                    </td>
                    <td>{formatLedgerPaymentJa(row.payment)}</td>
                    <td className="master-ledger-num">￥{row.total.toLocaleString()}</td>
                    <td className="master-ledger-act">
                      <div className="master-ledger-act__btns">
                        <LedgerEntryEditDateButton
                          entry={row}
                          variant="master"
                          onUpdated={() => setTick((x) => x + 1)}
                        />
                        <LedgerEntryDeleteButton
                          entry={row}
                          variant="master"
                          onDeleted={() => setTick((x) => x + 1)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="master-ledger-columns">
        <div className="master-ledger-block">
          <h3 className="master-ledger-block__title">卓別売上</h3>
          {report.byTable.length === 0 ? (
            <p className="master-ledger-empty">データなし</p>
          ) : (
            <div className="master-ledger-table-wrap">
              <table className="master-ledger-table">
                <thead>
                  <tr>
                    <th>卓・メモ（当日最終会計時）</th>
                    <th className="master-ledger-num">会計回数</th>
                    <th className="master-ledger-num">売上計</th>
                    <th className="master-ledger-num">NH売上</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byTable.map((row) => (
                    <tr key={row.tableLabel}>
                      <td className="master-ledger-desk-memo">
                        <span className="master-ledger-desk-memo__table">テーブル{row.tableLabel}</span>
                        {row.lastCheckoutMemo ? (
                          <span className="master-ledger-desk-memo__text">{row.lastCheckoutMemo}</span>
                        ) : null}
                      </td>
                      <td className="master-ledger-num">{row.checkouts}</td>
                      <td className="master-ledger-num">￥{row.sales.toLocaleString()}</td>
                      <td className="master-ledger-num">￥{row.nhSales.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="master-ledger-block">
          <h3 className="master-ledger-block__title">時間帯別（会計発生）</h3>
          {activeHours.length === 0 ? (
            <p className="master-ledger-empty">データなし</p>
          ) : (
            <div className="master-ledger-table-wrap">
              <table className="master-ledger-table">
                <thead>
                  <tr>
                    <th>時間帯</th>
                    <th className="master-ledger-num">件数</th>
                    <th className="master-ledger-num">売上</th>
                  </tr>
                </thead>
                <tbody>
                  {activeHours.map((slot) => (
                    <tr key={slot.hour}>
                      <td>{fmtHourRange(slot.hour)}</td>
                      <td className="master-ledger-num">{slot.checkouts}</td>
                      <td className="master-ledger-num">￥{slot.sales.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="master-ledger-columns">
        <div className="master-ledger-block">
          <h3 className="master-ledger-block__title">商品ランキング（人気順・提供数）</h3>
          <p className="master-ledger-block__hint">
            会計時に伝票へ載っていた品目です。提供数（行）合計 {report.totalLineItems} 行。
          </p>
          {report.products.length === 0 ? (
            <p className="master-ledger-empty">データなし</p>
          ) : (
            <div className="master-ledger-table-wrap">
              <table className="master-ledger-table">
                <thead>
                  <tr>
                    <th>区分</th>
                    <th>品目（先頭行）</th>
                    <th className="master-ledger-num">件数</th>
                    <th className="master-ledger-num">売上（単品計）</th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.slice(0, 40).map((p) => (
                    <tr key={p.key}>
                      <td>
                        {p.kind === 'nh'
                          ? 'NH'
                          : p.kind === 'nh_extra'
                            ? '別料金'
                            : p.kind === 'alcohol_charge'
                              ? '卓CH'
                              : '通常'}
                      </td>
                      <td>{p.label}</td>
                      <td className="master-ledger-num">{p.count}</td>
                      <td className="master-ledger-num">
                        {p.revenue > 0 ? `￥${p.revenue.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="master-ledger-block master-ledger-block--ops">
          <h3 className="master-ledger-block__title">オペ・混雑</h3>
          <ul className="master-ledger-ops-list">
            <li>
              <strong>売上ピーク帯</strong>
              <span>
                {report.checkoutCount > 0
                  ? `${fmtHourRange(report.peakHour)}（￥${report.peakSales.toLocaleString()}）`
                  : '—'}
              </span>
            </li>
            <li>
              <strong>会計件数ピーク帯（混雑の目安）</strong>
              <span>
                {report.checkoutCount > 0
                  ? `${fmtHourRange(report.busyHour)}（${report.busyCount}件）`
                  : '—'}
              </span>
            </li>
            <li>
              <strong>提供時間（料理別）</strong>
              <span className="master-ledger-ops-note">
                厨房ボタンからのタイムスタンプ差分は未計測です。POS／キッチンプリンタ連携で取れる予定。
              </span>
            </li>
          </ul>
        </div>
      </div>

      <p className="master-footnote master-footnote--inline">
        ※ 延長率・平均滞在・男女比は「飲み放題プランが付いた会計」のみから算出します。原価率は店舗入力の単一％で概算です。
      </p>
    </section>
  );
}
