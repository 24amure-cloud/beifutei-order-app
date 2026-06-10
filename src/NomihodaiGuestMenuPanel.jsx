import React, { useEffect, useMemo, useState } from 'react';
import {
  NOMIHODAI_GUEST_SHOTS_TAB_ID,
  NOMIHODAI_GUEST_TAB_ORDER,
} from './data/defaultNomihodaiCatalog.js';
import { nomihodaiGuestItemLabelFromItem, nomihodaiExtraShotRowLabel } from './nomihodaiGuestItemLabels.js';

const TAB_LABEL_JA = {
  'nh-cat-beer': 'ビール',
  'nh-cat-highball': 'ハイボール',
  'nh-cat-shochu': '焼酎・茶ハイ',
  'nh-cat-sour': 'サワー',
  'nh-cat-wine': 'ワイン',
  'nh-cat-cocktail': 'カクテル',
  [NOMIHODAI_GUEST_SHOTS_TAB_ID]: 'ショット',
  'nh-cat-nonalcoholic': 'ノンアル',
};

function sortGuestSections(catalog) {
  const list = (Array.isArray(catalog) ? catalog : []).filter((c) => c?.items?.length);
  const rank = new Map(NOMIHODAI_GUEST_TAB_ORDER.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : 999;
    const rb = rank.has(b.id) ? rank.get(b.id) : 999;
    return ra - rb;
  });
}

function shotsTabEntry(locale) {
  return {
    id: NOMIHODAI_GUEST_SHOTS_TAB_ID,
    titleJa: '別料金ショット',
    titleEn: 'EXTRA SHOTS',
    isShots: true,
    items: [],
  };
}

/** @param {boolean} includeShots */
function buildGuestTabs(catalog, includeShots) {
  const byId = new Map(sortGuestSections(catalog).map((s) => [s.id, s]));
  const tabs = [];
  for (const id of NOMIHODAI_GUEST_TAB_ORDER) {
    if (id === NOMIHODAI_GUEST_SHOTS_TAB_ID) {
      if (includeShots) tabs.push(shotsTabEntry());
      continue;
    }
    const sec = byId.get(id);
    if (sec) tabs.push(sec);
  }
  for (const sec of sortGuestSections(catalog)) {
    if (!tabs.some((t) => t.id === sec.id)) tabs.push(sec);
  }
  return tabs;
}

function tabLabel(tab, locale) {
  if (locale === 'en') return tab.titleEn;
  return TAB_LABEL_JA[tab.id] ?? tab.titleJa;
}

/**
 * 客席向け飲み放題メニュー（導入＝一覧閲覧 / 開始後＝タップ注文）
 * @param {'browse'|'order'} mode
 */
function GuestMenuTabBar({ tabs, activeId, setActiveId, locale, ariaLabel }) {
  return (
    <div className="nh-guest-menu__tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            data-cat={tab.id}
            className={`nh-guest-menu__tab${selected ? ' is-active' : ''}${tab.isShots ? ' nh-guest-menu__tab--shots' : ''}`}
            onClick={() => setActiveId(tab.id)}
          >
            <span className="nh-guest-menu__tab-main">{tabLabel(tab, locale)}</span>
            {locale !== 'en' ? <span className="nh-guest-menu__tab-sub">{tab.titleEn}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default function NomihodaiGuestMenuPanel({
  catalog = [],
  locale = 'ja',
  mode = 'browse',
  browseLayout = 'stack',
  onOrder,
  orderLabel = '注文',
  addCartLabel = 'カートへ',
  emptyLabel = 'メニューを読み込めませんでした。',
  extraShots = [],
  onAddShot,
  showExtraShots = false,
}) {
  const includeShots = showExtraShots && extraShots.length > 0;
  const tabs = useMemo(() => buildGuestTabs(catalog, includeShots), [catalog, includeShots]);
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');

  useEffect(() => {
    if (!tabs.length) {
      setActiveId('');
      return;
    }
    if (!tabs.some((t) => t.id === activeId)) {
      setActiveId(tabs[0].id);
    }
  }, [tabs, activeId]);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const isShotsActive = activeTab?.id === NOMIHODAI_GUEST_SHOTS_TAB_ID;

  if (!tabs.length) {
    return <p className="nh-guest-menu__empty">{emptyLabel}</p>;
  }

  if (mode === 'browse' && browseLayout === 'tabs') {
    const isShotsActive = activeTab?.id === NOMIHODAI_GUEST_SHOTS_TAB_ID;
    const tabListLabel = locale === 'en' ? 'Drink categories' : 'ドリンク区分';
    return (
      <div className="nh-guest-menu nh-guest-menu--browse nh-guest-menu--browse-tabs">
        <GuestMenuTabBar
          tabs={tabs}
          activeId={activeId}
          setActiveId={setActiveId}
          locale={locale}
          ariaLabel={tabListLabel}
        />
        {isShotsActive ? (
          <div className="nh-guest-menu__browse-panel" role="tabpanel">
            <p className="nh-guest-menu__browse-panel-note">
              {locale === 'en' ? 'Paid separately (not included)' : '別料金（飲み放題プラン外）'}
            </p>
            <ul className="nh-guest-menu__browse-grid">
              {extraShots.map((s) => (
                <li key={s.id} className="nh-guest-menu__browse-item nh-guest-menu__browse-item--priced">
                  <span>{nomihodaiExtraShotRowLabel(s, locale)}</span>
                  <span className="nh-guest-menu__browse-price">
                    ￥{s.price.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : activeTab ? (
          <div className="nh-guest-menu__browse-panel" role="tabpanel">
            <ul className="nh-guest-menu__browse-grid">
              {(activeTab.items || []).map((it) => {
                const extraYen = Number(it.price);
                const priced = Number.isFinite(extraYen) && extraYen > 0;
                return (
                  <li
                    key={it.id}
                    className={`nh-guest-menu__browse-item${priced ? ' nh-guest-menu__browse-item--priced' : ''}`}
                  >
                    <span>{nomihodaiGuestItemLabelFromItem(it, locale)}</span>
                    {priced ? (
                      <span className="nh-guest-menu__browse-price">
                        ￥{extraYen.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'browse') {
    return (
      <div className="nh-guest-menu nh-guest-menu--browse">
        {tabs.map((tab) =>
          tab.isShots ? (
            <section key={tab.id} className="nh-guest-menu__section nh-guest-menu__section--shots">
              <header className="nh-guest-menu__section-head">
                <h3 className="nh-guest-menu__section-title">{tabLabel(tab, locale)}</h3>
                {locale !== 'en' ? <p className="nh-guest-menu__section-sub">{tab.titleEn}</p> : null}
                <p className="nh-guest-menu__section-note">
                  {locale === 'en' ? 'Paid separately' : '別料金（プラン外）'}
                </p>
              </header>
              <ul className="nh-guest-menu__browse-list">
                {extraShots.map((s) => (
                  <li key={s.id}>
                    {nomihodaiExtraShotRowLabel(s, locale)}
                    <span className="nh-guest-menu__browse-price">
                      ￥{s.price.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section key={tab.id} className="nh-guest-menu__section">
              <header className="nh-guest-menu__section-head">
                <h3 className="nh-guest-menu__section-title">{tabLabel(tab, locale)}</h3>
                {locale !== 'en' ? <p className="nh-guest-menu__section-sub">{tab.titleEn}</p> : null}
              </header>
              <ul className="nh-guest-menu__browse-list">
                {(tab.items || []).map((it) => {
                  const extraYen = Number(it.price);
                  const priced = Number.isFinite(extraYen) && extraYen > 0;
                  return (
                    <li key={it.id}>
                      {nomihodaiGuestItemLabelFromItem(it, locale)}
                      {priced ? (
                        <span className="nh-guest-menu__browse-price">
                          ￥{extraYen.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          )
        )}
      </div>
    );
  }

  const tabListLabel = locale === 'en' ? 'Drink categories' : 'ドリンク区分';

  return (
    <div className="nh-guest-menu nh-guest-menu--order">
      <GuestMenuTabBar
        tabs={tabs}
        activeId={activeId}
        setActiveId={setActiveId}
        locale={locale}
        ariaLabel={tabListLabel}
      />

      {isShotsActive ? (
        <div className="nh-guest-menu__panel nh-guest-menu__panel--shots" role="tabpanel">
          <header className="nh-guest-menu__panel-head">
            <h3 className="nh-guest-menu__panel-title">
              {locale === 'en' ? 'Extra shots (paid)' : '別料金ショット'}
            </h3>
            <p className="nh-guest-menu__panel-hint nh-guest-menu__panel-hint--shots">
              {locale === 'en' ? 'Not included in free flow — add to cart' : '飲み放題プラン外です。「カートへ」で追加'}
            </p>
          </header>
          <ul className="nh-guest-menu__order-list">
            {extraShots.map((s) => (
              <li key={s.id} className="nh-guest-menu__order-row nh-guest-menu__order-row--shots">
                <span className="nh-guest-menu__order-name">{nomihodaiExtraShotRowLabel(s, locale)}</span>
                <span className="nh-guest-menu__order-price">
                  ￥{s.price.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                </span>
                <button
                  type="button"
                  className="nh-guest-menu__order-btn nh-guest-menu__order-btn--shots"
                  onClick={() => onAddShot?.({ id: s.id, name: s.name, price: s.price })}
                >
                  {addCartLabel}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : activeTab ? (
        <div className="nh-guest-menu__panel" role="tabpanel">
          <header className="nh-guest-menu__panel-head">
            <h3 className="nh-guest-menu__panel-title">{tabLabel(activeTab, locale)}</h3>
            <p className="nh-guest-menu__panel-hint">
              {locale === 'en' ? 'Tap ORDER to add to your cart' : '「注文」をタップしてカートに追加'}
            </p>
          </header>
          <ul className="nh-guest-menu__order-list">
            {(activeTab.items || []).map((it) => {
              const extraYen = Number(it.price);
              const priced = Number.isFinite(extraYen) && extraYen > 0;
              return (
                <li key={it.id} className="nh-guest-menu__order-row">
                  <span className="nh-guest-menu__order-name">
                    {nomihodaiGuestItemLabelFromItem(it, locale)}
                    {priced ? (
                      <span className="nh-guest-menu__order-price">
                        ￥{extraYen.toLocaleString(locale === 'en' ? 'en-US' : 'ja-JP')}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="nh-guest-menu__order-btn"
                    onClick={() => onOrder?.({ id: it.id, name: it.name, price: it.price })}
                  >
                    {orderLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
