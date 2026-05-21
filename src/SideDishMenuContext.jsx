import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_SIDE_DISH_SECTIONS } from './data/defaultSideDishMenu.js';
import { loadSideDishSections, saveSideDishSections, SIDE_DISH_MENU_STORAGE_KEY } from './sideDishMenuStorage.js';
import { useMenuPublishedSync } from './useMenuPublishedSync.js';

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

  const syncFromStorage = useCallback(() => {
    setSectionsState(loadSideDishSections());
  }, []);

  useMenuPublishedSync(syncFromStorage, ['sidedish', 'all'], SIDE_DISH_MENU_STORAGE_KEY);

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
