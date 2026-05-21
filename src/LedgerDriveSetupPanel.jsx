import React, { useCallback, useEffect, useState } from 'react';
import { uploadDailyLedgerCsvToGoogleDrive } from './dailyLedgerDriveUpload.js';
import { buildDailyLedgerCsvForDate, getPreviousLocalDateKey } from './dailyLedgerCsvExport.js';
import {
  isLedgerDriveUploadConfigured,
  loadLedgerDriveSettings,
  saveLedgerDriveSettings,
} from './ledgerDriveSettings.js';

function buildGasCodeSnippet(folderId, secret) {
  const fid = String(folderId || 'PASTE_DRIVE_FOLDER_ID_HERE').replace(/'/g, "\\'");
  const sec = String(secret || 'PASTE_SECRET').replace(/'/g, "\\'");
  return `const FOLDER_ID = '${fid}';
const WEBHOOK_SECRET = '${sec}';

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'beifutei-ledger-upload' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (WEBHOOK_SECRET && body.secret !== WEBHOOK_SECRET) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }
    const filename = String(body.filename || 'beifutei-ledger.csv');
    const csv = String(body.csv || '');
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const existing = folder.getFilesByName(filename);
    if (existing.hasNext()) {
      const file = existing.next();
      file.setContent(csv);
      return jsonOut({ ok: true, fileId: file.getId(), name: file.getName(), updated: true });
    }
    const file = folder.createFile(Utilities.newBlob(csv, 'text/csv', filename));
    return jsonOut({ ok: true, fileId: file.getId(), name: file.getName(), updated: false });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;
}

export default function LedgerDriveSetupPanel() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [folderId, setFolderId] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    const s = loadLedgerDriveSettings();
    setWebhookUrl(s.webhookUrl);
    setWebhookSecret(s.webhookSecret || String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_SECRET || ''));
    setFolderId(s.folderId || String(import.meta.env.VITE_LEDGER_DRIVE_FOLDER_ID || ''));
  }, []);

  useEffect(() => {
    reload();
    const envUrl = String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_URL || '').trim();
    if (envUrl) {
      const s = loadLedgerDriveSettings();
      if (!s.webhookUrl) {
        saveLedgerDriveSettings({
          webhookUrl: envUrl,
          webhookSecret: s.webhookSecret || String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_SECRET || ''),
          folderId: s.folderId || String(import.meta.env.VITE_LEDGER_DRIVE_FOLDER_ID || ''),
        });
        reload();
        setStatus('URL を自動で入れました。「設定を保存」は押さなくてもこの端末では有効です。');
      }
    }
    const onUpd = () => reload();
    window.addEventListener('beifutei-ledger-drive-settings-updated', onUpd);
    return () => window.removeEventListener('beifutei-ledger-drive-settings-updated', onUpd);
  }, [reload]);

  const onSave = () => {
    saveLedgerDriveSettings({ webhookUrl, webhookSecret, folderId });
    setStatus('設定を保存しました。このブラウザから Drive へ送信できます。');
  };

  const onCopyGas = async () => {
    const code = buildGasCodeSnippet(folderId, webhookSecret);
    try {
      await navigator.clipboard.writeText(code);
      setStatus('Apps Script 用コードをコピーしました。script.google.com の Code.gs に貼り付けてデプロイしてください。');
    } catch {
      window.prompt('コピーできませんでした。手動でコピーしてください', code);
    }
  };

  const onTestUpload = async () => {
    if (!isLedgerDriveUploadConfigured()) {
      setStatus('先にウェブアプリ URL を保存してください。');
      return;
    }
    setBusy(true);
    setStatus('送信中…');
    const yKey = getPreviousLocalDateKey();
    try {
      const r = await uploadDailyLedgerCsvToGoogleDrive(yKey);
      if (r.ok) {
        setStatus(`テスト成功: ${r.filename} を Drive に保存しました（fileId: ${r.fileId || '—'}）`);
      } else {
        setStatus(`失敗: ${r.message || r.reason || 'unknown'}`);
      }
    } catch (e) {
      setStatus(`失敗: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onPing = async () => {
    if (!webhookUrl.trim()) {
      setStatus('URL を入力してください。');
      return;
    }
    setBusy(true);
    try {
      const url = webhookUrl.trim().replace(/\/exec$/, '/exec');
      const res = await fetch(url.split('?')[0] + '?ping=1');
      const text = await res.text();
      setStatus(`接続確認: HTTP ${res.status} — ${text.slice(0, 120)}`);
    } catch (e) {
      setStatus(`接続確認失敗: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  };

  const configured = isLedgerDriveUploadConfigured();
  const envSecret = String(import.meta.env.VITE_LEDGER_DRIVE_WEBHOOK_SECRET || '').trim();

  return (
    <details className="master-ledger-drive-setup" open={false}>
      <summary className="master-ledger-drive-setup__summary">
        日計の自動バックアップ（スタッフ・設定済みなら不要）
        {configured ? ' ✓' : ''}
      </summary>
      <div className="master-ledger-drive-setup__body">
        <div className="master-ledger-drive-setup__guide">
          <details className="master-ledger-drive-setup__faq" open>
            <summary>いま「Googleはこのアプリを認証していません」と出ている方（ここだけ見ればOK）</summary>
            <ol className="master-ledger-drive-setup__steps master-ledger-drive-setup__steps--big">
              <li>
                青いボタン <strong>「続行」</strong> や <strong>「許可」</strong> はまだ押さない
              </li>
              <li>
                左下か文中の <strong>「上級」</strong>（英語画面なら <strong>Advanced</strong>）を<strong>1回タップ</strong>
              </li>
              <li>
                そのすぐ下に出る小さいリンク
                <strong>「beifutei-ledger（安全ではないページ）に移動」</strong>
                のような文字を<strong>1回タップ</strong>（「安全ではない」でOK・自分用です）
              </li>
              <li>
                <strong>「すべて選択」→「続行」</strong> または <strong>「許可」</strong>
              </li>
              <li>元の画面に戻ったら <strong>デプロイ</strong> をもう一度 → <strong>ウェブアプリ URL</strong> をコピー</li>
            </ol>
            <p className="master-ledger-drive-setup__faq-note">
              これはエラーではありません。自分で作ったプログラムだから Google が一度確認しているだけです。
            </p>
          </details>
          <p className="master-ledger-drive-setup__warn">
            <strong>注意:</strong> <code>.../edit</code> の URL（編集画面）は<strong>使えません</strong>。
            貼るのは <code>.../exec</code> で終わる URL だけです。
          </p>
          <h3 className="master-ledger-drive-setup__guide-title">A. Google 側（1回だけ）</h3>
          <ol className="master-ledger-drive-setup__steps">
            <li>
              <a
                href="https://script.google.com/d/132546OVHN9N7CBvrOYZ0feaCjKnl06MKFH3tSGq6vWvvS0wLF_VRwnnI/edit"
                target="_blank"
                rel="noopener noreferrer"
              >
                あなたの Apps Script を開く
              </a>
            </li>
            <li>
              左の <strong>Code.gs</strong> を開き、中身をすべて消す → 下の <strong>GASコードをコピー</strong>{' '}
              → 貼り付け → 上の💾（保存）
            </li>
            <li>
              右上 <strong>デプロイ</strong> → <strong>新しいデプロイ</strong> → 歯車⚙️「種類」→{' '}
              <strong>ウェブアプリ</strong>
            </li>
            <li>
              実行するユーザー: <strong>自分</strong>　／　アクセスできるユーザー: <strong>全員</strong> →{' '}
              <strong>デプロイ</strong>
            </li>
            <li>
              初回は <strong>アクセスを承認</strong>（Google・Drive へのアクセスを許可）
            </li>
            <li>
              表示された <strong>ウェブアプリ URL</strong> をコピー（例:{' '}
              <code>https://script.google.com/macros/s/……/exec</code>）
            </li>
          </ol>
          <h3 className="master-ledger-drive-setup__guide-title">B. オーナー画面（このページ）</h3>
          <ol className="master-ledger-drive-setup__steps">
            <li>下の「ウェブアプリ URL」に A-6 でコピーした <code>/exec</code> の URL を貼る</li>
            <li>
              フォルダ ID は <code>1bQ3tmGZ9Hir1Et4IPlSadO77Lp4hzmbP</code>（日計CSV）のままで OK →{' '}
              <strong>設定を保存</strong>
            </li>
            <li>
              <strong>接続確認</strong> → <strong>前日分をテスト送信</strong>（Drive に CSV が出れば完了）
            </li>
          </ol>
        </div>

        <div className="master-ledger-drive-setup__grid">
          <label className="master-ledger-drive-setup__field">
            <span>Drive フォルダ ID</span>
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
              autoComplete="off"
            />
          </label>
          <label className="master-ledger-drive-setup__field">
            <span>共有シークレット</span>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={envSecret || 'ランダムな長い文字列'}
              autoComplete="off"
            />
          </label>
          <label className="master-ledger-drive-setup__field master-ledger-drive-setup__field--wide">
            <span>ウェブアプリ URL（/exec で終わる）</span>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="master-ledger-drive-setup__actions">
          <button type="button" className="master-btn master-btn--secondary master-btn--small" onClick={onCopyGas}>
            GASコードをコピー
          </button>
          <button type="button" className="master-btn master-btn--secondary master-btn--small" onClick={onSave}>
            設定を保存
          </button>
          <button
            type="button"
            className="master-btn master-btn--secondary master-btn--small"
            onClick={onPing}
            disabled={busy}
          >
            接続確認
          </button>
          <button
            type="button"
            className="master-btn master-btn--small"
            onClick={onTestUpload}
            disabled={busy}
          >
            前日分をテスト送信
          </button>
        </div>

        {status ? (
          <p className="master-ledger-drive-setup__status" role="status">
            {status}
          </p>
        ) : null}

        {configured ? (
          <p className="master-ledger-drive-setup__hint">
            自動保存: 毎朝7時以降・前日分・1日1回（厨房画面を開いた端末）。昨日の行数プレビュー:{' '}
            {buildDailyLedgerCsvForDate(getPreviousLocalDateKey()).rowCount} 件
          </p>
        ) : null}
      </div>
    </details>
  );
}
