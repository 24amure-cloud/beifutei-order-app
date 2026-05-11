import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { tryAutoBackupYesterdayLedger } from './dailyLedgerCsvExport.js';
import { MenuMasterProvider } from './MenuMasterContext.jsx';
import { NomihodaiCatalogProvider } from './NomihodaiCatalogContext.jsx';
import { NomihodaiSessionProvider } from './NomihodaiSessionContext.jsx';
import MasterMenuPage from './MasterMenuPage.jsx';

function MasterAppShell() {
  useEffect(() => {
    const r = tryAutoBackupYesterdayLedger();
    if (r && 'ok' in r && r.ok) {
      console.info('[beifutei] 日次CSV 自動バックアップ', r.dateKey, r.rowCount, '件');
    }
  }, []);

  return (
    <div className="master-app-root">
      <div className="master-app-banner" role="banner">
        <span className="master-app-banner__label">オーナー専用</span>
        <span className="master-app-banner__text">
          メニュー編集・オーダー／売上サマリー（お客様向けオーダー画面とは別URLです）
        </span>
      </div>
      <MasterMenuPage />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NomihodaiSessionProvider>
      <MenuMasterProvider>
        <NomihodaiCatalogProvider>
          <MasterAppShell />
        </NomihodaiCatalogProvider>
      </MenuMasterProvider>
    </NomihodaiSessionProvider>
  </StrictMode>,
);
