import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { guestUiT } from './guestUiStrings.js';

const STORAGE_KEY = 'beifutei-guest-ui-locale';

const Ctx = createContext(null);

export function GuestUiLocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'en' || raw === 'ja') return raw;
    } catch {
      /* ignore */
    }
    return 'ja';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    try {
      document.documentElement.lang = locale === 'en' ? 'en' : 'ja';
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    setLocaleState((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      if (v === 'en' || v === 'ja') return v;
      return prev;
    });
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((l) => (l === 'ja' ? 'en' : 'ja'));
  }, []);

  const t = useCallback((key, vars) => guestUiT(locale, key, vars), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
    }),
    [locale, setLocale, toggleLocale, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGuestUiLocale() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useGuestUiLocale must be used within GuestUiLocaleProvider');
  }
  return v;
}

/** Provider 外（Storybook 等）用のフォールバック */
export function useGuestUiLocaleOptional() {
  return useContext(Ctx);
}
