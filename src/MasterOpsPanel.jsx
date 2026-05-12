import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadDailyLedgerCsvForDate } from './dailyLedgerCsvExport.js';
import {
  DAILY_LEDGER_STORAGE_KEY,
  formatLedgerPaymentJa,
  getLocalDateKey,
  loadDailyLedger,
  summarizeLedgerDay,
} from './dailyLedger.js';
import { buildGuestOrderPageUrl } from './guestOrderUrl.js';
import { collectKnownTableLabels, getNomihodaiForTable } from './nomihodaiSession.js';

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

  const knownTableLabels = useMemo(() => collectKnownTableLabels(session), [session]);
  const [customTableLabel, setCustomTableLabel] = useState('');
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(20);
  const [copyFlash, setCopyFlash] = useState(null);

  const copyText = useCallback(async (text, flashKey) => {
    try {
      await navigator.clipboard.writeText(text);
      if (flashKey != null) {
        setCopyFlash(flashKey);
        window.setTimeout(() => setCopyFlash((k) => (k === flashKey ? null : k)), 1600);
      }
    } catch {
      window.prompt('コピーできませんでした。手動でコピーしてください', text);
    }
  }, []);

  const copyGuestUrlForTable = useCallback(
    async (label) => {
      await copyText(buildGuestOrderPageUrl(label), `t:${label}`);
    },
    [copyText],
  );

  const copyGuestUrlRange = useCallback(async () => {
    const a = Math.max(1, Math.min(99, Number(rangeFrom) || 1));
    const b = Math.max(1, Math.min(99, Number(rangeTo) || 1));
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo > 60) {
      window.alert('一度にコピーできるのは最大60卓までです。');
      return;
    }
    const lines = [];
    for (let i = lo; i <= hi; i += 1) {
      const lbl = String(i);
      lines.push(`${lbl}\t${buildGuestOrderPageUrl(lbl)}`);
    }
    await copyText(lines.join('\n'), 'range');
  }, [copyText, rangeFrom, rangeTo]);

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

      <div className="master-ops-guest-url">
        <h3 className="master-ops-guest-url__title">客席オーダー用URL（卓ごと）</h3>
        <p className="master-ops-guest-url__lead">
          客席トップは左ナビ「3つの画面」のお客様用URL。ここでは <code className="master-ops-guest-url__code">?table=卓番</code>{' '}
          付きをコピーしてQRにしてください（この画面と同じドメインで組み立てます）。
        </p>
        {knownTableLabels.length > 0 ? (
          <div className="master-ops-guest-url__known">
            <span className="master-ops-guest-url__sub">データに現れている卓</span>
            <ul className="master-ops-guest-url__list">
              {knownTableLabels.map((lbl) => (
                <li key={lbl} className="master-ops-guest-url__row">
                  <span className="master-ops-guest-url__label">卓{lbl}</span>
                  <code className="master-ops-guest-url__href">{buildGuestOrderPageUrl(lbl)}</code>
                  <button
                    type="button"
                    className="master-btn master-btn--secondary master-btn--small"
                    onClick={() => copyGuestUrlForTable(lbl)}
                  >
                    {copyFlash === `t:${lbl}` ? 'コピー済み' : 'URLをコピー'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="master-ops-guest-url__empty">まだ卓の注文・状態が同期されていません（下の番号指定で URL を作れます）。</p>
        )}
        <div className="master-ops-guest-url__manual">
          <span className="master-ops-guest-url__sub">任意の卓番</span>
          <div className="master-ops-guest-url__manual-row">
            <input
              className="master-ops-guest-url__input"
              type="text"
              inputMode="numeric"
              placeholder="例: 12"
              value={customTableLabel}
              onChange={(e) => setCustomTableLabel(e.target.value)}
              aria-label="卓番"
            />
            <button
              type="button"
              className="master-btn master-btn--secondary master-btn--small"
              disabled={!String(customTableLabel).trim()}
              onClick={() => copyGuestUrlForTable(String(customTableLabel).trim())}
            >
              {copyFlash === `t:${String(customTableLabel).trim()}` ? 'コピー済み' : 'URLをコピー'}
            </button>
          </div>
        </div>
        <div className="master-ops-guest-url__range">
          <span className="master-ops-guest-url__sub">連番まとめて（タブ区切り：卓番 → URL）</span>
          <div className="master-ops-guest-url__range-row">
            <label className="master-ops-guest-url__range-lab">
              から
              <input
                className="master-ops-guest-url__input master-ops-guest-url__input--num"
                type="number"
                min={1}
                max={99}
                value={rangeFrom}
                onChange={(e) => setRangeFrom(Number(e.target.value))}
              />
            </label>
            <label className="master-ops-guest-url__range-lab">
              まで
              <input
                className="master-ops-guest-url__input master-ops-guest-url__input--num"
                type="number"
                min={1}
                max={99}
                value={rangeTo}
                onChange={(e) => setRangeTo(Number(e.target.value))}
              />
            </label>
            <button type="button" className="master-btn master-btn--secondary master-btn--small" onClick={copyGuestUrlRange}>
              {copyFlash === 'range' ? 'コピー済み' : '一覧をコピー'}
            </button>
          </div>
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
