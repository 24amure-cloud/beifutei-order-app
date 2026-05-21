/**
 * 毎朝7時以降、前日分の日計 CSV を1日1回バックアップ。
 * - VITE_LEDGER_DRIVE_WEBHOOK_URL あり → Google Drive（Apps Script）
 * - なし → ブラウザの CSV ダウンロード（従来どおり）
 *
 * 日計は localStorage のため、会計データがある端末（通常は厨房タブレット）で動かす必要があります。
 */

import { buildDailyLedgerCsvForDate, downloadTextFile, getPreviousLocalDateKey } from './dailyLedgerCsvExport.js';
import { isLedgerDriveUploadConfigured, uploadDailyLedgerCsvToGoogleDrive } from './dailyLedgerDriveUpload.js';
import { getLocalDateKey } from './dailyLedger.js';

export const SCHEDULED_BACKUP_LAST_RUN_KEY = 'beifutei-scheduled-ledger-backup-day-v1';
const CHECK_MS = 60_000;

/** ローカル時刻で 7:00 以降かつ本日未実行なら true */
export function shouldRunScheduledYesterdayBackup(now = new Date()) {
  if (now.getHours() < 7) return false;
  const today = getLocalDateKey(now.getTime());
  try {
    return localStorage.getItem(SCHEDULED_BACKUP_LAST_RUN_KEY) !== today;
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<{ ok: true, dateKey: string, rowCount: number, destination: 'drive'|'download', drive?: object } | { skipped: true, reason: string }>}
 */
export async function runScheduledYesterdayLedgerBackup() {
  if (!shouldRunScheduledYesterdayBackup()) {
    return { skipped: true, reason: 'not_due' };
  }

  const yKey = getPreviousLocalDateKey();
  const { csv, rowCount } = buildDailyLedgerCsvForDate(yKey);
  const safe = yKey.replace(/[^\d-]/g, '') || yKey;
  const filename = `beifutei-ledger-${safe}.csv`;

  let destination = 'download';
  let drive;

  if (isLedgerDriveUploadConfigured()) {
    drive = await uploadDailyLedgerCsvToGoogleDrive(yKey, csv, filename);
    if (drive?.ok) {
      destination = 'drive';
    } else {
      downloadTextFile(filename, csv);
      destination = 'download';
    }
  } else {
    downloadTextFile(filename, csv);
  }

  try {
    localStorage.setItem(SCHEDULED_BACKUP_LAST_RUN_KEY, getLocalDateKey());
  } catch {
    /* ignore */
  }

  return { ok: true, dateKey: yKey, rowCount, destination, drive };
}

/** マスター／厨房のどちらかでマウント。戻り値は clearInterval 用 */
export function startScheduledLedgerBackup() {
  let running = false;

  const tick = async () => {
    if (!shouldRunScheduledYesterdayBackup() || running) return;
    running = true;
    try {
      const r = await runScheduledYesterdayLedgerBackup();
      if (r && 'ok' in r && r.ok) {
        console.info('[beifutei] 日次CSVバックアップ（前日）', r);
        window.dispatchEvent(new CustomEvent('beifutei-scheduled-ledger-backup', { detail: r }));
      }
    } catch (e) {
      console.warn('[beifutei] 日次CSVバックアップ失敗', e);
    } finally {
      running = false;
    }
  };

  tick();
  return window.setInterval(tick, CHECK_MS);
}
