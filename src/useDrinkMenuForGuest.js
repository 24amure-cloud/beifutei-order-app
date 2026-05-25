import { useEffect, useMemo, useState } from 'react';
import { useMenuMaster } from './MenuMasterContext.jsx';
import { DRINK_SPOT_UPDATED_EVENT, loadDrinkSpotEnabled } from './drinkSpotStorage.js';
import { MENU_PUBLISHED_EVENT } from './menuMasterBroadcast.js';

/** 客席ドリンク：スポット品は厨房で ON のものだけ表示 */
export function useDrinkMenuForGuest() {
  const { drinkSections } = useMenuMaster();
  const [spotTick, setSpotTick] = useState(0);

  useEffect(() => {
    const bump = () => setSpotTick((t) => t + 1);
    window.addEventListener(DRINK_SPOT_UPDATED_EVENT, bump);
    const onPublished = (ev) => {
      const kind = ev?.detail?.kind;
      if (kind === 'drink' || kind === 'all') bump();
    };
    window.addEventListener(MENU_PUBLISHED_EVENT, onPublished);
    const onStorage = (e) => {
      if (e.key === 'beifutei-drink-spot-enabled-v1' || e.key === 'beifutei-menu-drink-sections-v1' || e.key == null) {
        bump();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DRINK_SPOT_UPDATED_EVENT, bump);
      window.removeEventListener(MENU_PUBLISHED_EVENT, onPublished);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return useMemo(() => {
    const enabled = loadDrinkSpotEnabled();
    return (drinkSections || [])
      .map((sec) => {
        if (sec.id !== 'spot') return sec;
        return {
          ...sec,
          items: (sec.items || []).filter((it) => enabled[it.id] === true),
        };
      })
      .filter((sec) => sec.id !== 'spot' || (sec.items && sec.items.length > 0));
  }, [drinkSections, spotTick]);
}
