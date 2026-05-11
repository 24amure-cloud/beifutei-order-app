import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bumpKitchenDiagnosticsUi,
  getSnapshot,
  isKitchenRealtimeLive,
  subscribeKitchenDiagnostics,
} from './kitchenDiagnostics.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';

function fmtClock(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return new Date(ms).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function supabaseHostHint() {
  try {
    const u = import.meta.env.VITE_SUPABASE_URL;
    if (!u) return 'URL 未設定';
    return new URL(u).host;
  } catch {
    return String(import.meta.env.VITE_SUPABASE_URL || '').slice(0, 40) || '—';
  }
}

/** 厨房トップバー右上：Realtime + ブラウザオンライン + DB 再同期 */
export function KitchenRealtimeBadge() {
  const { fullResyncDbFromSupabase } = useNomihodaiSession();
  const [snap, setSnap] = useState(() => getSnapshot());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = subscribeKitchenDiagnostics(setSnap);
    const onNet = () => bumpKitchenDiagnosticsUi();
    window.addEventListener('online', onNet);
    window.addEventListener('offline', onNet);
    return () => {
      unsub();
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
    };
  }, []);

  const live = useMemo(() => isKitchenRealtimeLive(snap), [snap]);
  const { orders, tables } = snap.channelStatus;

  let label = '接続中…';
  let tone = 'kitchen-live-badge--warn';
  let dot = '🟡';
  if (busy) {
    label = '再同期中…';
    tone = 'kitchen-live-badge--warn';
    dot = '🟡';
  } else if (!snap.isNavigatorOnline) {
    label = 'OFFLINE';
    tone = 'kitchen-live-badge--bad';
    dot = '🔴';
  } else if (live) {
    label = 'LIVE';
    tone = 'kitchen-live-badge--ok';
    dot = '🟢';
  } else if (orders === 'CHANNEL_ERROR' || tables === 'CHANNEL_ERROR' || orders === 'TIMED_OUT' || tables === 'TIMED_OUT') {
    label = '切断';
    tone = 'kitchen-live-badge--bad';
    dot = '🔴';
  }

  const onResync = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fullResyncDbFromSupabase({ reconnectRealtime: true, log: true });
    } finally {
      setBusy(false);
      bumpKitchenDiagnosticsUi();
    }
  }, [busy, fullResyncDbFromSupabase]);

  return (
    <div className="kitchen-live-badge-wrap">
      <div
        className={`kitchen-live-badge ${tone}`}
        role="status"
        aria-live="polite"
        title={`Realtime orders: ${orders} / tables: ${tables}\nブラウザ: ${snap.isNavigatorOnline ? 'online' : 'offline'}\n「再同期」で DB を全取得し購読を張り直せます。`}
      >
        <span className="kitchen-live-badge__dot" aria-hidden>
          {dot}
        </span>
        <span className="kitchen-live-badge__text">{label}</span>
      </div>
      <button
        type="button"
        className="kitchen-live-resync"
        disabled={busy || !snap.isNavigatorOnline}
        onClick={onResync}
        title="Supabase から注文・卓状態を再取得し、Realtime の購読を張り直します（スリープ・Wi‑Fi 復帰後の取りこぼし対策）"
      >
        ↻ 再同期
      </button>
    </div>
  );
}

/** 厨房画面下：Supabase 診断ログ（折りたたみ） */
export function KitchenDiagnosticsFooter() {
  const [snap, setSnap] = useState(() => getSnapshot());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeKitchenDiagnostics(setSnap);
    const onNet = () => bumpKitchenDiagnosticsUi();
    window.addEventListener('online', onNet);
    window.addEventListener('offline', onNet);
    return () => {
      unsub();
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
    };
  }, []);

  const live = isKitchenRealtimeLive(snap);
  const host = supabaseHostHint();
  const recent = snap.entries.slice(0, 12);

  return (
    <footer className={`kitchen-diag-footer${open ? ' kitchen-diag-footer--open' : ''}`} aria-label="接続・同期ログ">
      <button type="button" className="kitchen-diag-footer__toggle" onClick={() => setOpen((v) => !v)}>
        <span className="kitchen-diag-footer__summary">
          <strong>DB</strong> {host} · <strong>RT</strong> {snap.channelStatus.orders}/{snap.channelStatus.tables} ·{' '}
          <strong>同期</strong> {fmtClock(snap.lastSyncMs)}
          {snap.lastRestOk === false ? ' · ⚠️REST失敗あり' : ''}
        </span>
        <span className="kitchen-diag-footer__chev" aria-hidden>
          {open ? '▲ 閉じる' : '▼ 詳細'}
        </span>
      </button>
      {open ? (
        <div className="kitchen-diag-footer__panel">
          <dl className="kitchen-diag-footer__grid">
            <dt>Supabase</dt>
            <dd>{host}</dd>
            <dt>Realtime</dt>
            <dd>
              orders=<code>{snap.channelStatus.orders}</code> · tables=<code>{snap.channelStatus.tables}</code>
              {live ? ' · 両方 SUBSCRIBED' : ''}
            </dd>
            <dt>最終同期（ポーリング）</dt>
            <dd>{fmtClock(snap.lastSyncMs)}</dd>
            <dt>ブラウザ</dt>
            <dd>{snap.isNavigatorOnline ? 'online' : 'offline'}</dd>
          </dl>
          <p className="kitchen-diag-footer__hint">
            {
              'INSERT / RLS / SELECT 失敗は下に時系列で積みます（最大約50件）。注文が届かないのにリロードすると出るときは、右上の「↻ 再同期」ボタンで DB 全取得と Realtime 再接続を試してください。'
            }
          </p>
          <ul className="kitchen-diag-footer__log" aria-label="エラーログ">
            {recent.length === 0 ? (
              <li className="kitchen-diag-footer__log-empty">まだ記録なし</li>
            ) : (
              recent.map((e, i) => (
                <li key={`${e.t}-${e.tag}-${i}`} className={`kitchen-diag-footer__log-row kitchen-diag-footer__log-row--${e.severity}`}>
                  <span className="kitchen-diag-footer__log-t">{fmtClock(e.t)}</span>
                  <span className="kitchen-diag-footer__log-tag">{e.tag}</span>
                  <span className="kitchen-diag-footer__log-msg">{e.message}</span>
                  {e.detail ? <span className="kitchen-diag-footer__log-detail">{e.detail}</span> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </footer>
  );
}
