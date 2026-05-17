import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SIDE_DISH_SECTIONS } from './data/defaultSideDishMenu.js';
import { loadSideDishSections, saveSideDishSections } from './sideDishMenuStorage.js';
import { subscribeMenuPublished } from './menuMasterBroadcast.js';

const SideDishMenuContext = createContext(null);

export function SideDishMenuProvider({ children }) {
  const [sections, setSectionsState] = useState(() => loadSideDishSections());

  const setSideDishSections = useCallback((next) => {
    setSectionsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveSideDishSections(value);
      return value;
    });
  }, []);

  const resetSideDishMenuToDefault = useCallback(() => {
    const fresh = structuredClone(DEFAULT_SIDE_DISH_SECTIONS);
    saveSideDishSections(fresh);
    setSectionsState(fresh);
  }, []);

  useEffect(() => {
    const sync = () => setSectionsState(loadSideDishSections());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    const unsub = subscribeMenuPublished((msg) => {
      if (msg?.kind === 'sidedish' || msg?.kind === 'all') sync();
    });
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      unsub();
    };
  }, []);

  const value = useMemo(
    () => ({
      sideDishSections: sections,
      setSideDishSections,
      resetSideDishMenuToDefault,
      defaultSideDishSections: DEFAULT_SIDE_DISH_SECTIONS,
    }),
    [sections, setSideDishSections, resetSideDishMenuToDefault],
  );

  return <SideDishMenuContext.Provider value={value}>{children}</SideDishMenuContext.Provider>;
}

export function useSideDishMenu() {
  const ctx = useContext(SideDishMenuContext);
  if (!ctx) throw new Error('useSideDishMenu must be used within SideDishMenuProvider');
  return ctx;
}
