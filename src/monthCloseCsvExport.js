import { BUCKET_LABELS } from './monthCloseAnalytics.js';

function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** @param {import('./monthCloseStorage.js').MonthCloseRecord} record */
export function buildMonthCloseCsv(record) {
  const headers = ['項目', '値'];
  const rows = [headers.join(',')];
  const push = (k, v) => rows.push([escapeCsvCell(k), escapeCsvCell(v)].join(','));

  push('monthKey', record.monthKey);
  push('confirmedAt', new Date(record.confirmedAt).toISOString());
  push('会計件数', record.checkoutCount);
  push('総売上', record.grandTotal);
  push('現金', record.cashTotal);
  push('カード', record.cardTotal);
  push('飲み放題売上', record.nhPlanTotal);
  push('フード等売上', record.foodTotal);
  push('飲み放題比率%', record.nhSharePct.toFixed(1));
  push('フード比率%', record.foodSharePct.toFixed(1));

  for (const [key, label] of Object.entries(BUCKET_LABELS)) {
    const b = record.bucketShares[key];
    if (!b) continue;
    push(`${label}売上`, b.revenue);
    push(`${label}構成比%`, b.sharePct.toFixed(1));
    push(`${label}総売上比%`, b.sharePctOfGrand.toFixed(1));
    push(`${label}行数`, b.lineCount);
  }

  for (const line of record.costLines || []) {
    push(`${line.label}%`, line.percent);
    push(`${line.label}金額`, line.amountYen);
  }

  if (record.memo) push('メモ', record.memo);

  return `\uFEFF${rows.join('\r\n')}`;
}

export function downloadMonthCloseCsv(record) {
  const csv = buildMonthCloseCsv(record);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `beifutei-month-close-${record.monthKey}.csv`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadAllMonthClosesCsv(records) {
  const headers = [
    'monthKey',
    'confirmedAt',
    'checkoutCount',
    'grandTotal',
    'cashTotal',
    'cardTotal',
    'softcream',
    'cafe',
    'takeout',
    'nhPlanTotal',
    'foodTotal',
    'cogsPercent',
    'cogsYen',
  ];
  const out = [headers.join(',')];
  for (const r of records) {
    const cogs = (r.costLines || []).find((l) => l.key === 'cogs');
    out.push(
      [
        r.monthKey,
        new Date(r.confirmedAt).toISOString(),
        r.checkoutCount,
        r.grandTotal,
        r.cashTotal,
        r.cardTotal,
        r.bucketShares?.softcream_fruit?.revenue ?? 0,
        r.bucketShares?.cafe_drink?.revenue ?? 0,
        r.bucketShares?.takeout_sweets?.revenue ?? 0,
        r.nhPlanTotal,
        r.foodTotal,
        cogs?.percent ?? '',
        cogs?.amountYen ?? '',
      ].join(','),
    );
  }
  const blob = new Blob([`\uFEFF${out.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'beifutei-month-close-all.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
