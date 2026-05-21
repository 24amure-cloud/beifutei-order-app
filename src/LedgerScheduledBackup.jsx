import { useEffect } from 'react';
import { startScheduledLedgerBackup } from './dailyLedgerScheduledBackup.js';
import { loadLedgerDriveSettings, saveLedgerDriveSettings } from './ledgerDriveSettings.js';

function seedDriveSettingsFromEnv() {
  const envUrl = String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_URL || '').trim();
  if (!envUrl) return;
  const s = loadLedgerDriveSettings();
  if (s.webhookUrl) return;
  saveLedgerDriveSettings({
    webhookUrl: envUrl,
    webhookSecret: s.webhookSecret || String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_SECRET || ''),
    folderId: s.folderId || String(import.meta.env.VITE_LEDGER_DRIVE_FOLDER_ID || ''),
  });
}

/** 日計 localStorage があるタブで、7時以降に前日 CSV を自動出力 */
export default function LedgerScheduledBackup() {
  useEffect(() => {
    seedDriveSettingsFromEnv();
    const id = startScheduledLedgerBackup();
    return () => window.clearInterval(id);
  }, []);
  return null;
}
