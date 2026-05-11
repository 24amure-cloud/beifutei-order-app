/**
 * 厨房スタッフ画面用：Supabase / Realtime の簡易診断（ログリングバッファ + 購読）
 * 客席 App からは import しない想定。
 */

const MAX_ENTRIES = 48;
const listeners = new Set();

/** @type {{ orders: string, tables: string, lastErr?: string }} */
let channelStatus = { orders: 'INIT', tables: 'INIT' };
let lastSyncMs = null;
let lastRestOk = null;

function notify() {
  for (const fn of listeners) {
    try {
      fn(getSnapshot());
    } catch {
      /* ignore */
    }
  }
}

/** オンライン／オフライン切替など、ストア以外の要因で UI だけ更新したいとき */
export function bumpKitchenDiagnosticsUi() {
  notify();
}

/** @type {Array<{ t: number, severity: 'ok'|'warn'|'err', tag: string, message: string, detail?: string }>} */
let entries = [];

export function getSnapshot() {
  return {
    channelStatus: { ...channelStatus },
    lastSyncMs,
    lastRestOk,
    entries: [...entries],
    isNavigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

export function subscribeKitchenDiagnostics(fn) {
  listeners.add(fn);
  try {
    fn(getSnapshot());
  } catch {
    /* ignore */
  }
  return () => listeners.delete(fn);
}

function classifySupabaseError(error) {
  if (!error) return { kind: 'unknown', hint: '' };
  const msg = String(error.message || error.details || '');
  const code = String(error.code || '');
  if (/row-level security|RLS/i.test(msg) || code === '42501') {
    return { kind: 'RLS', hint: 'ポリシー・ログイン役割を確認' };
  }
  if (code === 'PGRST116' || /JWT expired|invalid/i.test(msg)) {
    return { kind: 'AUTH', hint: 'anon key / セッション' };
  }
  return { kind: 'REST', hint: code || '' };
}

/**
 * @param {'ok'|'warn'|'err'} severity
 * @param {string} tag
 * @param {string} message
 * @param {string} [detail]
 */
export function pushKitchenDiag(severity, tag, message, detail) {
  const row = {
    t: Date.now(),
    severity,
    tag,
    message: String(message || '').slice(0, 220),
    detail: detail != null ? String(detail).slice(0, 400) : undefined,
  };
  entries = [row, ...entries].slice(0, MAX_ENTRIES);
  notify();
}

/** @param {{ message?: string, code?: string, details?: string } | null} error */
export function pushKitchenDiagFromSupabase(tag, error, op = '') {
  if (!error) return;
  const { kind, hint } = classifySupabaseError(error);
  const sev = kind === 'RLS' || kind === 'AUTH' ? 'err' : 'warn';
  const msg = `${op ? `${op}: ` : ''}${error.message || 'エラー'} (${kind})`;
  const detail = [hint, error.code, error.details].filter(Boolean).join(' · ');
  pushKitchenDiag(sev, tag, msg, detail);
}

/**
 * @param {'orders'|'tables'} which
 * @param {string} status Realtime subscribe status
 * @param {Error | undefined} err
 */
export function reportRealtimeChannelStatus(which, status, err) {
  if (which === 'orders') channelStatus.orders = status;
  if (which === 'tables') channelStatus.tables = status;
  if (err) {
    channelStatus.lastErr = String(err.message || err);
    pushKitchenDiag('err', 'realtime', `${which}: ${status}`, channelStatus.lastErr);
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
    pushKitchenDiag('warn', 'realtime', `${which}: ${status}`, '');
  }
  notify();
}

export function markKitchenRestSyncOk() {
  lastSyncMs = Date.now();
  lastRestOk = true;
  notify();
}

export function markKitchenRestSyncError(tag, error) {
  lastRestOk = false;
  pushKitchenDiagFromSupabase(tag, error, '同期SELECT');
  notify();
}

export function isKitchenRealtimeLive(snapshot) {
  const s = snapshot || getSnapshot();
  if (!s.isNavigatorOnline) return false;
  return s.channelStatus.orders === 'SUBSCRIBED' && s.channelStatus.tables === 'SUBSCRIBED';
}
