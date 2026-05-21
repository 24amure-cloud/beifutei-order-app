import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_NOMIHODAI_CATALOG } from './data/defaultNomihodaiCatalog.js';
import { loadNomihodaiCatalog, saveNomihodaiCatalog, NOMIHODAI_CATALOG_STORAGE_KEY } from './nomihodaiCatalogStorage.js';
import { useMenuPublishedSync } from './useMenuPublishedSync.js';

const NomihodaiCatalogContext = createContext(null);

export function NomihodaiCatalogProvider({ children }) {
  const [catalog, setCatalogState] = useState(() => loadNomihodaiCatalog());

  const setNomihodaiCatalog = useCallback((next) => {
    setCatalogState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveNomihodaiCatalog(value);
      return value;
    });
  }, []);

  const resetNomihodaiCatalogToDefault = useCallback(() => {
    const fresh = structuredClone(DEFAULT_NOMIHODAI_CATALOG);
    saveNomihodaiCatalog(fresh);
    setCatalogState(fresh);
  }, []);

  const syncFromStorage = useCallback(() => {
    setCatalogState(loadNomihodaiCatalog());
  }, []);

  useMenuPublishedSync(syncFromStorage, ['nomihodai', 'all'], NOMIHODAI_CATALOG_STORAGE_KEY);

  const value = useMemo(
    () => ({
      nomihodaiCatalog: catalog,
      setNomihodaiCatalog,
      resetNomihodaiCatalogToDefault,
      defaultNomihodaiCatalog: DEFAULT_NOMIHODAI_CATALOG,
    }),
    [catalog, setNomihodaiCatalog, resetNomihodaiCatalogToDefault]
  );

  return (
    <NomihodaiCatalogContext.Provider value={value}>{children}</NomihodaiCatalogContext.Provider>
  );
}

export function useNomihodaiCatalog() {
  const ctx = useContext(NomihodaiCatalogContext);
  if (!ctx) throw new Error('useNomihodaiCatalog must be used within NomihodaiCatalogProvider');
  return ctx;
}
