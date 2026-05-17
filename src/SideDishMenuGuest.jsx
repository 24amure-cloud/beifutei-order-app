import React, { Fragment } from 'react';
import { useSideDishMenu } from './SideDishMenuContext.jsx';
import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';
import { takeoutAssetUrl } from './useTakeoutSweetsDisplay.js';

function cssBgUrl(path) {
  return path ? `url("${takeoutAssetUrl(path)}")` : undefined;
}

function guestSideName(item, locale, ut) {
  if (item.id === 'sd-frank' && locale === 'en') return ut('sd_name_frank');
  return item.name;
}

function ListRow({ item, yp, addToCart, ut }) {
  return (
    <div className="sd-list-row">
      <div className="sd-list-line">
        <span className="sd-list-name">{item.name}</span>
        <span className="sd-list-leader" aria-hidden="true" />
        <span className="sd-list-price">{yp(item.price)}</span>
      </div>
      <button
        type="button"
        className="add-btn sd-add-btn"
        onClick={() => addToCart({ id: item.id, name: item.name, price: item.price })}
      >
        {ut('drink_add')}
      </button>
    </div>
  );
}

function SectionImages({ items, foot }) {
  const rowClass = foot ? 'sd-images-row sd-images-row--foot' : 'sd-images-row sd-images-row--toriaezu';
  return (
    <div className={rowClass}>
      {(items || []).map((it) => {
        if (!it.image) return null;
        const imgClass = it.imageLayout === 'round' ? 'sd-image-round' : 'sd-image-medium';
        return (
          <div
            key={it.id}
            className={imgClass}
            style={{
              backgroundImage: cssBgUrl(it.image),
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
        );
      })}
    </div>
  );
}

export default function SideDishMenuGuest({ addToCart, PageHeaderImage }) {
  const { sideDishSections } = useSideDishMenu();
  const { t: ut, locale } = useGuestUiLocale();
  const yp = (n) => (locale === 'en' ? `${n} ${ut('sd_yen_tax')}` : `${n}円`);

  const sectionTitle = (sec) => {
    const ja = typeof sec.titleJa === 'string' ? sec.titleJa.trim() : '';
    if (ja) return ja;
    return sec.titleKey ? ut(sec.titleKey) : '';
  };

  const heroSec = sideDishSections.find((s) => s.layout === 'hero');
  const drinksSec = sideDishSections.find((s) => s.layout === 'drinks');
  const listSections = sideDishSections.filter((s) => s.layout === 'list-images');
  const footSections = sideDishSections.filter((s) => s.layout === 'list-images-foot');

  const heroItem = heroSec?.items?.[0];

  return (
    <main className="main-content" style={{ background: '#FAF8F5' }}>
      <div className="side-dish-wrapper">
        <PageHeaderImage pageKey="sidedish" alt={ut('header_sidedish')} />

        {(heroItem || drinksSec) && (
          <div className="sd-top-grid">
            {heroItem ? (
              <div className="sd-feature-card">
                <div className="sd-feature-body">
                  <div className="sd-badge">RECOMMEND</div>
                  <div className="sd-title">
                    {guestSideName(heroItem, locale, ut)
                      .split('\n')
                      .map((line, i, arr) => (
                        <Fragment key={i}>
                          {line}
                          {i < arr.length - 1 ? <br /> : null}
                        </Fragment>
                      ))}
                  </div>
                  <p className="sd-desc">{ut('sd_feature_desc')}</p>
                  <div className="sd-price">
                    {locale === 'en' ? (
                      <>
                        {heroItem.price} {ut('sd_yen_tax')} <small>{ut('tax_included_short')}</small>
                      </>
                    ) : (
                      <>
                        {heroItem.price}
                        <span>円</span> <small>(税込)</small>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="add-btn sd-add-btn sd-add-btn--hero"
                    onClick={() => addToCart({ id: heroItem.id, name: heroItem.name, price: heroItem.price })}
                  >
                    {ut('sd_cart_add_to')}
                  </button>
                </div>
                {heroItem.image ? (
                  <div
                    className="sd-image-large"
                    style={{
                      backgroundImage: cssBgUrl(heroItem.image),
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  />
                ) : null}
              </div>
            ) : null}

            {drinksSec ? (
              <aside className="sd-recommend-drink" aria-label={ut('sd_recommend_aria')}>
                <div className="sd-drink-kicker">DRINK</div>
                <div className="sd-drink-title">{sectionTitle(drinksSec)}</div>
                <div className="sd-drink-grid">
                  {(drinksSec.items || []).map((it) => (
                    <div key={it.id} className="sd-drink-item">
                      <div className="sd-drink-img">
                        {it.image ? (
                          <img src={takeoutAssetUrl(it.image)} alt="" className="sd-drink-photo" decoding="async" />
                        ) : null}
                      </div>
                      <div className="sd-drink-name">{it.name}</div>
                      <div className="sd-drink-price">
                        {locale === 'en' ? `${it.price} ${ut('sd_yen_tax')}` : `${it.price}円`}
                      </div>
                      <button
                        type="button"
                        className="add-btn sd-add-btn"
                        onClick={() => addToCart({ id: it.id, name: it.name, price: it.price })}
                      >
                        {ut('drink_add')}
                      </button>
                    </div>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        )}

        {listSections.map((sec) => (
          <div key={sec.id} className="sd-row-toriaezu">
            <div className="sd-col-card sd-col-card--toriaezu" aria-label={sectionTitle(sec)}>
              <div className="sd-section-title">{sectionTitle(sec)}</div>
              <div className="sd-toriaezu-inner">
                <div className="sd-toriaezu-lines">
                  {(sec.items || []).map((it) => (
                    <ListRow key={it.id} item={it} yp={yp} addToCart={addToCart} ut={ut} />
                  ))}
                </div>
                <SectionImages items={sec.items} foot={false} />
              </div>
            </div>
          </div>
        ))}

        {footSections.length > 0 ? (
          <div className="sd-grid-2">
            {footSections.map((sec) => (
              <div key={sec.id} className="sd-col-card">
                <div className="sd-section-title">{sectionTitle(sec)}</div>
                {(sec.items || []).map((it) => (
                  <ListRow key={it.id} item={it} yp={yp} addToCart={addToCart} ut={ut} />
                ))}
                <SectionImages items={sec.items} foot />
              </div>
            ))}
          </div>
        ) : null}

        <p className="sd-page-foot">{ut('sd_page_foot')}</p>
      </div>
    </main>
  );
}
