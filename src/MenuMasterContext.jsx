import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_DRINK_MENU_SECTIONS } from './data/defaultDrinkMenu.js';
import { loadDrinkMenuSections, saveDrinkMenuSections, DRINK_MENU_STORAGE_KEY } from './menuStorage.js';
import { useMenuPublishedSync } from './useMenuPublishedSync.js';

const MenuMasterContext = createContext(null);

export function MenuMasterProvider({ children }) {
  const [drinkSections, setDrinkSectionsState] = useState(() => loadDrinkMenuSections());

  const setDrinkSections = useCallback((next) => {
    setDrinkSectionsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveDrinkMenuSections(value);
      return value;
    });
  }, []);

  const resetDrinkMenuToDefault = useCallback(() => {
    const fresh = structuredClone(DEFAULT_DRINK_MENU_SECTIONS);
    saveDrinkMenuSections(fresh);
    setDrinkSectionsState(fresh);
  }, []);

  const syncFromStorage = useCallback(() => {
    setDrinkSectionsState(loadDrinkMenuSections());
  }, []);

  useMenuPublishedSync(syncFromStorage, ['drink', 'all'], DRINK_MENU_STORAGE_KEY);

  const value = useMemo(
    () => ({
      drinkSections,
      setDrinkSections,
      resetDrinkMenuToDefault,
      defaultDrinkSections: DEFAULT_DRINK_MENU_SECTIONS,
    }),
    [drinkSections, setDrinkSections, resetDrinkMenuToDefault]
  );

  return <MenuMasterContext.Provider value={value}>{children}</MenuMasterContext.Provider>;
}

export function useMenuMaster() {
  const ctx = useContext(MenuMasterContext);
  if (!ctx) throw new Error('useMenuMaster must be used within MenuMasterProvider');
  return ctx;
}
