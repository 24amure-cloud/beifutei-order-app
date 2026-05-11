import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import KitchenApp from './KitchenApp.jsx';
import { MenuMasterProvider } from './MenuMasterContext.jsx';
import { NomihodaiCatalogProvider } from './NomihodaiCatalogContext.jsx';
import { NomihodaiSessionProvider } from './NomihodaiSessionContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NomihodaiSessionProvider>
      <MenuMasterProvider>
        <NomihodaiCatalogProvider>
          <KitchenApp />
        </NomihodaiCatalogProvider>
      </MenuMasterProvider>
    </NomihodaiSessionProvider>
  </StrictMode>
);
