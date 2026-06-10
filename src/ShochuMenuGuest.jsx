import React, { useMemo, useState } from 'react';
import { SHOCHU_MENU_HOTSPOTS, SHOCHU_MENU_IMAGE_FILES } from './data/shochuMenuPage.js';
import { useSideDishMenu } from './SideDishMenuContext.jsx';
import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { useDrinkMenuForGuest } from './useDrinkMenuForGuest.js';
import { guestDrinkRowName, guestTakeoutItemDisplayName } from './guestMenuDisplay.js';

const ASSET_BASE = import.meta.env.BASE_URL;

function assetUrl(path) {
  const normalized = String(path).replace(/^\//, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return ASSET_BASE || '/';
  const encoded = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const base = ASSET_BASE || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${encoded}`;
}

function shortenHotspotLabel(name) {
  const raw = String(name || '').split('\n')[0].trim();
  const paren = raw.indexOf('（');
  const base = paren > 0 ? raw.slice(0, paren).trim() : raw;
  return base.length > 14 ? `${base.slice(0, 13)}…` : base;
}

function formatHotspotPrice(yen, locale) {
  const n = Math.max(0, Number(yen) || 0);
  return locale === 'en' ? `¥${n.toLocaleString('en-US')}` : `￥${n.toLocaleString('ja-JP')}`;
}

function findSideItem(sections, id) {
  for (const sec of sections || []) {
    const hit = (sec.items || []).find((it) => it.id === id);
    if (hit) return hit;
  }
  return null;
}

export default function ShochuMenuGuest({ addToCart, onNotify, onOpenDrinkTab }) {
  const drinkSections = useDrinkMenuForGuest();
  const { sideDishSections } = useSideDishMenu();
  const { nomihodaiActive } = useNomihodaiSession();
  const { t: ut, locale } = useGuestUiLocale();
  const [imgAttempt, setImgAttempt] = useState(0);

  const drinkById = useMemo(() => {
    const shochu = drinkSections.find((s) => s.id === 'shochu');
    return Object.fromEntries((shochu?.items || []).map((it) => [it.id, it]));
  }, [drinkSections]);

  const resolvedHotspots = useMemo(() => {
    return SHOCHU_MENU_HOTSPOTS.map((spot) => {
      if (spot.kind === 'drink') {
        const it = drinkById[spot.drinkId];
        if (!it) return null;
        const label = guestDrinkRowName(it, locale);
        return {
          key: spot.drinkId,
          label,
          shortLabel: locale === 'en' ? label : shortenHotspotLabel(it.name),
          price: it.price,
          product: { id: it.id, name: it.name, price: it.price },
          rect: spot,
        };
      }
      const it = findSideItem(sideDishSections, spot.sideId);
      if (!it) return null;
      const label = guestTakeoutItemDisplayName(it, locale);
      return {
        key: spot.sideId,
        label,
        shortLabel: locale === 'en' ? label : shortenHotspotLabel(it.name),
        price: it.price,
        product: { id: it.id, name: it.name, price: it.price },
        rect: spot,
      };
    }).filter(Boolean);
  }, [drinkById, sideDishSections, locale]);

  const imgExhausted = imgAttempt >= SHOCHU_MENU_IMAGE_FILES.length;
  const imgSrc = !imgExhausted ? assetUrl(SHOCHU_MENU_IMAGE_FILES[imgAttempt]) : '';

  const onHotspot = (spot) => {
    if (nomihodaiActive) return;
    addToCart(spot.product);
    onNotify?.(ut('shochu_added', { name: spot.label }));
  };

  return (
    <main
      className={`main-content shochu-menu-page${locale === 'en' ? ' shochu-menu-page--en' : ''}${nomihodaiActive ? ' shochu-menu-page--locked' : ''}`}
      style={{ background: '#F5F0E6' }}
    >
      <div className="shochu-menu-page__inner">
        {nomihodaiActive ? (
          <p className="shochu-menu-page__lock" role="status">
            {ut('drink_lock_before')}
            <strong>{ut('drink_lock_tab')}</strong>
            {ut('drink_lock_after')}
          </p>
        ) : (
          <p className="shochu-menu-page__hint">{ut('shochu_tap_hint')}</p>
        )}

        <div className="shochu-menu-page__frame">
          {!imgExhausted ? (
            <img
              className="shochu-menu-page__img"
              src={imgSrc}
              alt={ut('shochu_page_alt')}
              decoding="async"
              onError={() => setImgAttempt((n) => n + 1)}
            />
          ) : (
            <div className="shochu-menu-page__missing" role="status">
              <p>{ut('shochu_image_missing')}</p>
              <code>public/shochu-menu.png</code>
            </div>
          )}

          {resolvedHotspots.map((spot) => (
            <button
              key={spot.key}
              type="button"
              className="shochu-menu-page__hotspot"
              style={{
                left: `${spot.rect.left}%`,
                top: `${spot.rect.top}%`,
                width: `${spot.rect.width}%`,
                height: `${spot.rect.height}%`,
              }}
              disabled={nomihodaiActive}
              aria-label={ut('shochu_hotspot_aria', { name: spot.label })}
              onClick={() => onHotspot(spot)}
            >
              <span className="shochu-menu-page__hotspot-chip" aria-hidden="true">
                <span className="shochu-menu-page__hotspot-name">{spot.shortLabel}</span>
                <span className="shochu-menu-page__hotspot-price">
                  {formatHotspotPrice(spot.price, locale)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <footer className="shochu-menu-page__foot">
          <button type="button" className="shochu-menu-page__link" onClick={onOpenDrinkTab}>
            {ut('shochu_link_drink_list')}
          </button>
          <p className="shochu-menu-page__tax">{ut('drink_footer')}</p>
        </footer>
      </div>
    </main>
  );
}
