import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_NOMIHODAI_CATALOG } from './data/defaultNomihodaiCatalog.js';
import { loadNomihodaiCatalog, saveNomihodaiCatalog } from './nomihodaiCatalogStorage.js';
import { subscribeMenuPublished } from './menuMasterBroadcast.js';

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

  useEffect(() => {
    const sync = () => setCatalogState(loadNomihodaiCatalog());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    const unsubBc = subscribeMenuPublished((msg) => {
      if (msg?.kind === 'nomihodai' || msg?.kind === 'all') sync();
    });
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      unsubBc();
    };
  }, []);

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
