import React, { useEffect, useMemo, useState } from 'react';
import { downloadDailyLedgerCsvForDate } from './dailyLedgerCsvExport.js';
import {
  DAILY_LEDGER_STORAGE_KEY,
  formatLedgerPaymentJa,
  getLocalDateKey,
  loadDailyLedger,
  summarizeLedgerDay,
} from './dailyLedger.js';
import { getNomihodaiForTable } from './nomihodaiSession.js';

/** 卓セッション・飲み放題の簡易サマリー（localStorage 共有のスナップショット） */
export default function MasterOpsPanel({
  session,
  nomihodaiActive,
  countdown,
  kitchenHref,
  pendingNomihodaiCount,
  showKitchenLink = true,
  staffHubNote = false,
}) {
  const n = getNomihodaiForTable(session, session.tableLabel);
  const lbl = String(session.tableLabel || '3');
  const nhOrders = session.orders.filter(
    (o) => o.isNomihodai && String(o.tableLabel ?? '3') === lbl
  );
  const served = nhOrders.filter((o) => o.status === 'served').length;
  const farewell = session.nomihodaiFarewell;

  const [ledgerTick, setLedgerTick] = useState(0);
  useEffect(() => {
    const onUpd = () => setLedgerTick((x) => x + 1);
    const onStorage = (e) => {
      if (e.key === DAILY_LEDGER_STORAGE_KEY || e.key === null) onUpd();
    };
    window.addEventListener('beifutei-daily-ledger-updated', onUpd);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beifutei-daily-ledger-updated', onUpd);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const { todayKey, daySum } = useMemo(() => {
    const { entries } = loadDailyLedger();
    const key = getLocalDateKey();
    return { todayKey: key, daySum: summarizeLedgerDay(entries, key) };
  }, [ledgerTick]);

  return (
    <section className="master-card master-card--ops">
      <div className="master-card-head">
        <h2 className="master-card-title">卓・売上サマリー</h2>
        {showKitchenLink ? (
          <a href={kitchenHref} className="master-btn master-btn--primary" target="_blank" rel="noopener noreferrer">
            スタッフ画面を開く
          </a>
        ) : null}
      </div>
      <p className="master-page-lead master-page-lead--compact">
        {staffHubNote
          ? 'この端末のスタッフ画面と同一セッションです。未提供は「注文一覧」、卓・飲み放題・伝票は「各卓・伝票」から行えます。'
          : '同一オリジン・同一ポートの客席タブレットと共有しているセッションの状態です。精算や提供操作は厨房画面で行ってください。'}
      </p>

      <div className="master-ops-grid">
        <div className="master-ops-kpi">
          <span className="master-ops-kpi__label">卓番号（表示）</span>
          <strong className="master-ops-kpi__value">{session.tableLabel}番</strong>
        </div>
        <div className="master-ops-kpi">
          <span className="master-ops-kpi__label">飲み放題</span>
          <strong className="master-ops-kpi__value">
            {nomihodaiActive
              ? `稼働中（終了まで約 ${countdown.endMin ?? '—'} 分）`
              : farewell
                ? '会計フロー中／終了処理'
                : '停止中'}
          </strong>
        </div>
        {nomihodaiActive && n && (
          <div className="master-ops-kpi master-ops-kpi--wide">
            <span className="master-ops-kpi__label">プラン料金（税込・厨房入力値）</span>
            <strong className="master-ops-kpi__value">￥{n.billTotal.toLocaleString()}</strong>
          </div>
        )}
        <div className="master-ops-kpi master-ops-kpi--wide">
          <span className="master-ops-kpi__label">飲み放題ドリンク（厨房カウント）</span>
          <strong className="master-ops-kpi__value">
            未提供 {pendingNomihodaiCount}／提供済 {served}
          </strong>
        </div>
      </div>

      <div className="master-ops-ledger">
        <div className="master-ops-ledger__head">
          <h3 className="master-ops-ledger__title">本日の日計（{todayKey}）</h3>
          <button
            type="button"
            className="master-btn master-btn--secondary master-btn--small"
            onClick={() => downloadDailyLedgerCsvForDate(todayKey)}
          >
            本日をCSV保存
          </button>
        </div>
        <div className="master-ops-ledger__kpis">
          <div className="master-ops-kpi">
            <span className="master-ops-kpi__label">会計件数</span>
            <strong className="master-ops-kpi__value">{daySum.count}件</strong>
          </div>
          <div className="master-ops-kpi">
            <span className="master-ops-kpi__label">現金</span>
            <strong className="master-ops-kpi__value">￥{daySum.cash.toLocaleString()}</strong>
          </div>
          <div className="master-ops-kpi">
            <span className="master-ops-kpi__label">カード</span>
            <strong className="master-ops-kpi__value">￥{daySum.card.toLocaleString()}</strong>
          </div>
          <div className="master-ops-kpi master-ops-kpi--wide">
            <span className="master-ops-kpi__label">日計合計</span>
            <strong className="master-ops-kpi__value">￥{daySum.grand.toLocaleString()}</strong>
          </div>
        </div>
        {daySum.rows.length === 0 ? (
          <p className="master-ops-ledger__empty">まだ本日の会計記録がありません（厨房「各卓・伝票」の伝票から会計してください）</p>
        ) : (
          <div className="master-ops-ledger__table-wrap">
            <table className="master-ops-ledger__table">
              <thead>
                <tr>
                  <th>時刻</th>
                  <th>卓</th>
                  <th>区分</th>
                  <th className="master-ops-ledger__num">合計</th>
                </tr>
              </thead>
              <tbody>
                {[...daySum.rows].reverse().map((e) => (
                  <tr key={e.id}>
                    <td>
                      {new Date(e.recordedAt).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{e.tableLabel}番</td>
                    <td>{formatLedgerPaymentJa(e.payment)}</td>
                    <td className="master-ops-ledger__num">￥{e.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="master-footnote master-footnote--inline">
        ※ 日計は厨房「各卓・伝票」で会計確定した分のみ反映されます（同一ブラウザ・同一オリジン内の localStorage）。
      </p>
    </section>
  );
}
