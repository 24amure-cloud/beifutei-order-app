import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import LedgerScheduledBackup from './LedgerScheduledBackup.jsx';
import { MenuMasterProvider } from './MenuMasterContext.jsx';
import { NomihodaiCatalogProvider } from './NomihodaiCatalogContext.jsx';
import { TakeoutSweetsMenuProvider } from './TakeoutSweetsMenuContext.jsx';
import { SideDishMenuProvider } from './SideDishMenuContext.jsx';
import { NomihodaiSessionProvider } from './NomihodaiSessionContext.jsx';
import MasterMenuPage from './MasterMenuPage.jsx';
import { isSupabaseConfigured } from './supabaseClient.js';
import SupabaseConfigMissingScreen from './SupabaseConfigMissingScreen.jsx';
import RootErrorBoundary from './RootErrorBoundary.jsx';

function MasterAppShell() {
  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissingScreen />;
  }

  return (
    <div className="master-app-root">
      <LedgerScheduledBackup />
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
    <RootErrorBoundary>
      <NomihodaiSessionProvider>
        <MenuMasterProvider>
          <NomihodaiCatalogProvider>
            <TakeoutSweetsMenuProvider>
              <SideDishMenuProvider>
                <MasterAppShell />
              </SideDishMenuProvider>
            </TakeoutSweetsMenuProvider>
          </NomihodaiCatalogProvider>
        </MenuMasterProvider>
      </NomihodaiSessionProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
