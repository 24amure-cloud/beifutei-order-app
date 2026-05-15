import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_DRINK_MENU_SECTIONS } from './data/defaultDrinkMenu.js';
import { loadDrinkMenuSections, saveDrinkMenuSections } from './menuStorage.js';
import { subscribeMenuPublished } from './menuMasterBroadcast.js';

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

  useEffect(() => {
    const sync = () => setDrinkSectionsState(loadDrinkMenuSections());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    const unsubBc = subscribeMenuPublished((msg) => {
      if (msg?.kind === 'drink' || msg?.kind === 'all') sync();
    });
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      unsubBc();
    };
  }, []);

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
