import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { recoverStaleServiceWorker } from './swBootRecovery.js';
import './index.css';

recoverStaleServiceWorker();
import KitchenApp from './KitchenApp.jsx';
import { MenuMasterProvider } from './MenuMasterContext.jsx';
import { NomihodaiCatalogProvider } from './NomihodaiCatalogContext.jsx';
import { TakeoutSweetsMenuProvider } from './TakeoutSweetsMenuContext.jsx';
import { NomihodaiSessionProvider } from './NomihodaiSessionContext.jsx';
import RootErrorBoundary from './RootErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <NomihodaiSessionProvider>
        <MenuMasterProvider>
          <NomihodaiCatalogProvider>
            <TakeoutSweetsMenuProvider>
              <KitchenApp />
            </TakeoutSweetsMenuProvider>
          </NomihodaiCatalogProvider>
        </MenuMasterProvider>
      </NomihodaiSessionProvider>
    </RootErrorBoundary>
  </StrictMode>
);
