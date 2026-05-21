/** 日計 → Google Drive（Apps Script）連携。環境変数より localStorage を優先（オーナー画面で設定可） */

export const LEDGER_DRIVE_SETTINGS_KEY = 'beifutei-ledger-drive-settings-v1';

/** @typedef {{ webhookUrl: string, webhookSecret: string, folderId: string }} LedgerDriveSettings */

export function loadLedgerDriveSettings() {
  try {
    const raw = localStorage.getItem(LEDGER_DRIVE_SETTINGS_KEY);
    if (!raw) return defaultLedgerDriveSettings();
    const p = JSON.parse(raw);
    return {
      webhookUrl: String(p.webhookUrl || '').trim(),
      webhookSecret: String(p.webhookSecret || '').trim(),
      folderId: String(p.folderId || '').trim(),
    };
  } catch {
    return defaultLedgerDriveSettings();
  }
}

export function defaultLedgerDriveSettings() {
  return {
    webhookUrl: String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_URL || '').trim(),
    webhookSecret: String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_SECRET || '').trim(),
    folderId: String(import.meta.env.VITE_LEDGER_DRIVE_FOLDER_ID || '').trim(),
  };
}

/** @param {Partial<LedgerDriveSettings>} patch */
export function saveLedgerDriveSettings(patch) {
  const prev = loadLedgerDriveSettings();
  const next = {
    webhookUrl: patch.webhookUrl != null ? String(patch.webhookUrl).trim() : prev.webhookUrl,
    webhookSecret:
      patch.webhookSecret != null ? String(patch.webhookSecret).trim() : prev.webhookSecret,
    folderId: patch.folderId != null ? String(patch.folderId).trim() : prev.folderId,
  };
  localStorage.setItem(LEDGER_DRIVE_SETTINGS_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new CustomEvent('beifutei-ledger-drive-settings-updated'));
  } catch {
    /* ignore */
  }
  return next;
}

export function getLedgerDriveWebhookUrl() {
  const s = loadLedgerDriveSettings();
  return s.webhookUrl || String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_URL || '').trim();
}

export function getLedgerDriveWebhookSecret() {
  const s = loadLedgerDriveSettings();
  return s.webhookSecret || String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_SECRET || '').trim();
}

export function isLedgerDriveUploadConfigured() {
  return getLedgerDriveWebhookUrl().length > 0;
}
