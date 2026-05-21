import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_TAKEOUT_SWEETS_SECTIONS } from './data/defaultTakeoutSweetsMenu.js';
import { loadTakeoutSweetsSections, saveTakeoutSweetsSections, TAKEOUT_SWEETS_MENU_STORAGE_KEY } from './takeoutSweetsMenuStorage.js';
import { loadTakeoutInventoryMap, saveTakeoutInventoryMap, TAKEOUT_INVENTORY_STORAGE_KEY } from './takeoutSweetsInventoryStorage.js';
import { useMenuPublishedSync } from './useMenuPublishedSync.js';

const TakeoutSweetsMenuContext = createContext(null);

export function TakeoutSweetsMenuProvider({ children }) {
  const [sections, setSectionsState] = useState(() => loadTakeoutSweetsSections());
  const [inventoryMap, setInventoryMapState] = useState(() => loadTakeoutInventoryMap());

  const setTakeoutSections = useCallback((next) => {
    setSectionsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveTakeoutSweetsSections(value);
      return value;
    });
  }, []);

  const setTakeoutInventoryMap = useCallback((next) => {
    setInventoryMapState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveTakeoutInventoryMap(value);
      return value;
    });
  }, []);

  const resetTakeoutMenuToDefault = useCallback(() => {
    const freshSections = structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
    saveTakeoutSweetsSections(freshSections);
    setSectionsState(freshSections);
    const inv = loadTakeoutInventoryMap();
    saveTakeoutInventoryMap(inv);
    setInventoryMapState(inv);
  }, []);

  const syncFromStorage = useCallback(() => {
    setSectionsState(loadTakeoutSweetsSections());
    setInventoryMapState(loadTakeoutInventoryMap());
  }, []);

  useMenuPublishedSync(syncFromStorage, ['takeout', 'all'], [
    TAKEOUT_SWEETS_MENU_STORAGE_KEY,
    TAKEOUT_INVENTORY_STORAGE_KEY,
  ]);

  const value = useMemo(
    () => ({
      takeoutSections: sections,
      takeoutInventoryMap: inventoryMap,
      setTakeoutSections,
      setTakeoutInventoryMap,
      resetTakeoutMenuToDefault,
      defaultTakeoutSections: DEFAULT_TAKEOUT_SWEETS_SECTIONS,
    }),
    [sections, inventoryMap, setTakeoutSections, setTakeoutInventoryMap, resetTakeoutMenuToDefault],
  );

  return <TakeoutSweetsMenuContext.Provider value={value}>{children}</TakeoutSweetsMenuContext.Provider>;
}

export function useTakeoutSweetsMenu() {
  const ctx = useContext(TakeoutSweetsMenuContext);
  if (!ctx) throw new Error('useTakeoutSweetsMenu must be used within TakeoutSweetsMenuProvider');
  return ctx;
}
