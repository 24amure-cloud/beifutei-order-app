/**
 * Google Drive へ日計 CSV を送る（Apps Script ウェブアプリ URL 経由）。
 */

import { buildDailyLedgerCsvForDate } from './dailyLedgerCsvExport.js';
import {
  getLedgerDriveWebhookSecret,
  getLedgerDriveWebhookUrl,
  isLedgerDriveUploadConfigured,
} from './ledgerDriveSettings.js';

export { isLedgerDriveUploadConfigured };

/**
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} [csvBody]
 * @param {string} [filename]
 */
export async function uploadDailyLedgerCsvToGoogleDrive(dateKey, csvBody, filename) {
  const webhook = getLedgerDriveWebhookUrl();
  if (!webhook) {
    return { ok: false, reason: 'no_webhook' };
  }

  const dk = String(dateKey || '').trim();
  const { csv } = csvBody != null ? { csv: csvBody } : buildDailyLedgerCsvForDate(dk);
  const safe = dk.replace(/[^\d-]/g, '') || dk;
  const name = filename || `beifutei-ledger-${safe}.csv`;
  const body = JSON.stringify({
    secret: getLedgerDriveWebhookSecret(),
    dateKey: dk,
    filename: name,
    csv,
  });

  // application/json は CORS プリフライトで GAS が失敗しやすいため text/plain
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      reason: 'http_error',
      status: res.status,
      message: payload.error || res.statusText,
    };
  }

  if (payload.ok === false) {
    return { ok: false, reason: 'gas_error', message: payload.error || 'upload rejected' };
  }

  return { ok: true, filename: name, fileId: payload.fileId };
}
