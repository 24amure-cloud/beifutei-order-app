import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MenuMasterProvider } from './MenuMasterContext.jsx'
import { NomihodaiCatalogProvider } from './NomihodaiCatalogContext.jsx'
import { NomihodaiSessionProvider } from './NomihodaiSessionContext.jsx'
import { GuestUiLocaleProvider } from './GuestUiLocaleContext.jsx'
import RootErrorBoundary from './RootErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <NomihodaiSessionProvider>
        <GuestUiLocaleProvider>
          <MenuMasterProvider>
            <NomihodaiCatalogProvider>
              <App />
            </NomihodaiCatalogProvider>
          </MenuMasterProvider>
        </GuestUiLocaleProvider>
      </NomihodaiSessionProvider>
    </RootErrorBoundary>
  </StrictMode>,
)
