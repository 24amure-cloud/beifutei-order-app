import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TAKEOUT_SWEETS_SECTIONS } from './data/defaultTakeoutSweetsMenu.js';
import { loadTakeoutSweetsSections, saveTakeoutSweetsSections } from './takeoutSweetsMenuStorage.js';
import { loadTakeoutInventoryMap, saveTakeoutInventoryMap } from './takeoutSweetsInventoryStorage.js';
import { subscribeMenuPublished } from './menuMasterBroadcast.js';

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

  useEffect(() => {
    const sync = () => {
      setSectionsState(loadTakeoutSweetsSections());
      setInventoryMapState(loadTakeoutInventoryMap());
    };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    const unsub = subscribeMenuPublished((msg) => {
      if (msg?.kind === 'takeout' || msg?.kind === 'all') sync();
    });
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      unsub();
    };
  }, []);

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
