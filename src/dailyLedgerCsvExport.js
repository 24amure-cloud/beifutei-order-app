/**
 * 日計（localStorage の beifutei-daily-ledger）を CSV で書き出し。
 * UTF-8 BOM 付きで Excel 日本語環境向け。
 */

import { formatLedgerPaymentJa, getLocalDateKey, loadDailyLedger } from './dailyLedger.js';

export function ledgerEntriesForDate(entries, dateKey) {
  const dk = String(dateKey || '');
  return entries.filter((e) => e && e.dateKey === dk);
}

/** ローカル日付で「昨日」の dateKey（sv-SE YYYY-MM-DD） */
export function getPreviousLocalDateKey(now = Date.now()) {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
}

function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {import('./dailyLedger.js').LedgerEntry[]} rows
 * @param {string} dateKey
 */
export function buildDailyLedgerCsvForRows(rows, dateKey) {
  const headers = [
    'dateKey',
    'recordedAtMs',
    'recordedAtIso',
    'tableLabel',
    'tableKey',
    'payment',
    'paymentJa',
    'total',
    'normalSubtotal',
    'nomihodaiPlanYen',
    'alcoholChargeYen',
    'normalCount',
    'nomihodaiCount',
    'hadNomihodaiCheckout',
    'nhStartMs',
    'nhEndMsAtCheckout',
    'extensionCount',
    'menCount',
    'womenCount',
    'people',
    'stayMinutes',
    'checkoutMemo',
    'linesJson',
  ];
  const out = [headers.join(',')];
  for (const e of rows) {
    let iso = '';
    try {
      iso = new Date(e.recordedAt).toISOString();
    } catch {
      iso = '';
    }
    const linesJson = escapeCsvCell(JSON.stringify(Array.isArray(e.lines) ? e.lines : []));
    out.push(
      [
        escapeCsvCell(e.dateKey || dateKey),
        e.recordedAt,
        escapeCsvCell(iso),
        escapeCsvCell(e.tableLabel),
        escapeCsvCell(e.tableKey),
        escapeCsvCell(e.payment),
        escapeCsvCell(formatLedgerPaymentJa(e.payment)),
        e.total,
        e.normalSubtotal,
        e.nomihodaiPlanYen,
        e.alcoholChargeYen ?? '',
        e.normalCount,
        e.nomihodaiCount,
        e.hadNomihodaiCheckout ? '1' : '0',
        e.nhStartMs ?? '',
        e.nhEndMsAtCheckout ?? '',
        e.extensionCount ?? '',
        e.menCount ?? '',
        e.womenCount ?? '',
        e.people ?? '',
        e.stayMinutes ?? '',
        escapeCsvCell(e.checkoutMemo),
        linesJson,
      ].join(','),
    );
  }
  return `\uFEFF${out.join('\r\n')}`;
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @returns {{ csv: string, rowCount: number }}
 */
export function buildDailyLedgerCsvForDate(dateKey) {
  const { entries } = loadDailyLedger();
  const rows = ledgerEntriesForDate(entries, dateKey);
  return { csv: buildDailyLedgerCsvForRows(rows, dateKey), rowCount: rows.length };
}

export function downloadTextFile(filename, body, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 指定日の日計を CSV ダウンロード（0件でもヘッダのみ出力） */
export function downloadDailyLedgerCsvForDate(dateKey) {
  const { csv, rowCount } = buildDailyLedgerCsvForDate(dateKey);
  const safe = String(dateKey || getLocalDateKey()).replace(/[^\d-]/g, '') || getLocalDateKey();
  downloadTextFile(`beifutei-ledger-${safe}.csv`, csv);
  return { rowCount };
}
