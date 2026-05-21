/**
 * 日計 CSV → Google Drive
 * デプロイ: clasp push && clasp deploy --description "ledger-upload"
 * または script.google.com で手動デプロイ（ウェブアプリ・実行:自分・アクセス:全員）
 */

const FOLDER_ID = '1bQ3tmGZ9Hir1Et4IPlSadO77Lp4hzmbP';
const WEBHOOK_SECRET = 'IPILg_wygjMW4Ffvv--VciZvHUsQx3Kv';

function doGet() {
  return jsonOut({ ok: true, service: 'beifutei-ledger-upload' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: 'empty body' });
    }
    const body = JSON.parse(e.postData.contents);
    if (WEBHOOK_SECRET && body.secret !== WEBHOOK_SECRET) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }
    const filename = String(body.filename || 'beifutei-ledger.csv');
    const csv = String(body.csv || '');
    if (!csv) {
      return jsonOut({ ok: false, error: 'empty csv' });
    }
    if (!FOLDER_ID || FOLDER_ID.indexOf('PASTE_') === 0) {
      return jsonOut({ ok: false, error: 'FOLDER_ID not configured in Code.gs' });
    }
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const blob = Utilities.newBlob(csv, 'text/csv', filename);
    const existing = folder.getFilesByName(filename);
    if (existing.hasNext()) {
      const file = existing.next();
      file.setContent(csv);
      return jsonOut({ ok: true, fileId: file.getId(), name: file.getName(), updated: true });
    }
    const file = folder.createFile(blob);
    return jsonOut({ ok: true, fileId: file.getId(), name: file.getName(), updated: false });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
