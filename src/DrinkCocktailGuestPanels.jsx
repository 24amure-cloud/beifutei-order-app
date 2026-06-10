import React, { useMemo } from 'react';
import DrinkHeroImage from './DrinkHeroImage.jsx';
import { getDrinkSectionHeroCandidates } from './data/drinkHeroImages.js';
import { splitDrinkCocktailItemsForGuest } from './data/drinkCocktailGuestPanels.js';
import { guestDrinkRowName } from './guestMenuDisplay.js';

function DrinkCocktailItemRow({ it, addToCart, nomihodaiActive, ut, locale }) {
  return (
    <li className="drink-page-row drink-page-row--cocktail-compact">
      <span className="drink-page-row__name">{guestDrinkRowName(it, locale)}</span>
      <span className="drink-page-row__price">
        {it.price != null
          ? `￥${it.price.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}`
          : ut('drink_price_ask')}
      </span>
      {it.price != null ? (
        <button
          type="button"
          className="drink-page-row__add"
          disabled={nomihodaiActive}
          onClick={() =>
            addToCart({
              id: it.id,
              name: it.name,
              nameEn: it.nameEn,
              price: it.price,
            })
          }
          title={nomihodaiActive ? ut('drink_lock_title') : undefined}
        >
          {ut('drink_add')}
        </button>
      ) : (
        <span className="drink-page-row__na" title={ut('drink_row_na_title')}>
          —
        </span>
      )}
    </li>
  );
}

function DrinkCocktailPanel({ panel, addToCart, nomihodaiActive, ut, locale }) {
  const subtitle = locale === 'en' ? panel.subtitleEn : panel.subtitleJa;
  return (
    <div className="drink-page-cat drink-page-cat--cocktail-panel">
      <div className="drink-page-cat__head drink-page-cat__head--cocktail-panel">
        <DrinkHeroImage
          candidates={getDrinkSectionHeroCandidates(panel.heroSectionId)}
          className="drink-page-cat__hero drink-page-cat__hero--cocktail-panel"
          imgClassName="drink-page-cat__hero-img"
        />
        <div className="drink-page-cat__head-titles">
          {locale === 'en' ? (
            <span className="drink-page-cat__en">{panel.titleEn}</span>
          ) : (
            <>
              <span className="drink-page-cat__en">{panel.titleEn}</span>
              <span className="drink-page-cat__ja">{panel.titleJa}</span>
            </>
          )}
          {subtitle ? <span className="drink-page-cat__cocktail-sub">{subtitle}</span> : null}
        </div>
      </div>
      <ul className="drink-page-list drink-page-list--cocktail-panel">
        {panel.items.map((it) => (
          <DrinkCocktailItemRow
            key={it.id}
            it={it}
            addToCart={addToCart}
            nomihodaiActive={nomihodaiActive}
            ut={ut}
            locale={locale}
          />
        ))}
      </ul>
    </div>
  );
}

/** カクテル作成一覧：2ヒーロー・2列パネル */
export default function DrinkCocktailGuestPanels({ sec, addToCart, nomihodaiActive, ut, locale }) {
  const panels = useMemo(() => splitDrinkCocktailItemsForGuest(sec.items), [sec.items]);
  return (
    <div className="drink-page-cocktail-grid" aria-label={locale === 'en' ? 'Cocktails' : 'カクテル'}>
      {panels.map((panel) => (
        <DrinkCocktailPanel
          key={panel.id}
          panel={panel}
          addToCart={addToCart}
          nomihodaiActive={nomihodaiActive}
          ut={ut}
          locale={locale}
        />
      ))}
    </div>
  );
}
