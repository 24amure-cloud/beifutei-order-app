import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { recoverStaleServiceWorker } from './swBootRecovery.js'
import './index.css'

recoverStaleServiceWorker()
import App from './App.jsx'
import { MenuMasterProvider } from './MenuMasterContext.jsx'
import { NomihodaiCatalogProvider } from './NomihodaiCatalogContext.jsx'
import { TakeoutSweetsMenuProvider } from './TakeoutSweetsMenuContext.jsx'
import { SideDishMenuProvider } from './SideDishMenuContext.jsx'
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
              <TakeoutSweetsMenuProvider>
                <SideDishMenuProvider>
                  <App />
                </SideDishMenuProvider>
              </TakeoutSweetsMenuProvider>
            </NomihodaiCatalogProvider>
          </MenuMasterProvider>
        </GuestUiLocaleProvider>
      </NomihodaiSessionProvider>
    </RootErrorBoundary>
  </StrictMode>,
)
