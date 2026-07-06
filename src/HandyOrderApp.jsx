import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSideDishMenu } from './SideDishMenuContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { useDrinkMenuForGuest } from './useDrinkMenuForGuest.js';
import { useTakeoutSweetsDisplay } from './useTakeoutSweetsDisplay.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getNomihodaiForTable } from './nomihodaiSession.js';
import {
  HANDY_MENU_GROUPS,
  buildHandyMenuCatalog,
  buildHandyQuickItems,
  getHandySectionsForGroup,
  loadHandyRecentPicks,
  pushHandyRecentPick,
  resolveHandyPickKey,
  searchHandyMenuItems,
} from './handyMenuCatalog.js';
import { buildKitchenPageAbsoluteUrl } from './guestOrderUrl.js';
import { bootstrapPwaTableForPage, persistTableLabelFromApp } from './pwaTableBootstrap.js';
import SupabaseConnectionBanner from './SupabaseConnectionBanner.jsx';
import { isSupabaseConfigured } from './supabaseClient.js';
import SupabaseConfigMissingScreen from './SupabaseConfigMissingScreen.jsx';
import HandyAburasobaBuilder from './HandyAburasobaBuilder.jsx';
import HandySweetsBrowser from './HandySweetsBrowser.jsx';
import HandyDrinkBrowser from './HandyDrinkBrowser.jsx';
import HandyNomihodaiBrowser from './HandyNomihodaiBrowser.jsx';
import HandyRetailBrowser from './HandyRetailBrowser.jsx';

const TABLE_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function pickPriceLabel(pick, nhActive, nhPlanDrinks) {
  const isDrink = pick.kind === 'drink';
  const nhFree = pick.forceNh || (nhActive && nhPlanDrinks && isDrink);
  return nhFree ? 'NH' : `￥${pick.price.toLocaleString()}`;
}

/** 1行＝大きな＋、右端に数量調整（ハンディ向け） */
function HandyItemRow({ pick, qty, nhActive, nhPlanDrinks, compact, onAdd, onRemove }) {
  const priceLabel = pickPriceLabel(pick, nhActive, nhPlanDrinks);
  const soldOut = !!pick.soldOut;

  return (
    <div
      className={`handy-row${qty > 0 ? ' handy-row--in-cart' : ''}${compact ? ' handy-row--compact' : ''}${soldOut ? ' handy-row--soldout' : ''}`}
    >
      <button
        type="button"
        className="handy-row__main"
        disabled={soldOut}
        onClick={() => onAdd(pick)}
        aria-label={`${pick.itemName}を追加`}
      >
        <span className="handy-row__name">
          {pick.itemName}
          {soldOut ? <span className="handy-row__soldout">品切れ</span> : null}
        </span>
        <span className="handy-row__price">{priceLabel}</span>
      </button>
      <div className="handy-row__qty" aria-label={`${pick.itemName}の数量`}>
        <button
          type="button"
          className="handy-row__qty-btn"
          disabled={qty <= 0}
          onClick={() => onRemove(pick)}
          aria-label="1つ減らす"
        >
          −
        </button>
        <span className="handy-row__qty-num">{qty || ''}</span>
        <button
          type="button"
          className="handy-row__qty-btn handy-row__qty-btn--plus"
          disabled={soldOut}
          onClick={() => onAdd(pick)}
          aria-label="1つ増やす"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

/**
 * スタッフ向けハンディ注文 — 注文受けながら素早く操作
 */
export default function HandyOrderApp() {
  const { session, addStaffOrdersForTable } = useNomihodaiSession();
  const drinkSections = useDrinkMenuForGuest();
  const { sideDishSections } = useSideDishMenu();
  const { nomihodaiCatalog } = useNomihodaiCatalog();
  const { sectionsForDisplay } = useTakeoutSweetsDisplay();

  const [tableLabel, setTableLabel] = useState(() => {
    const boot = bootstrapPwaTableForPage();
    return boot.tableLabel || '1';
  });
  const [groupId, setGroupId] = useState('quick');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  const [flow, setFlow] = useState('kitchen');
  const [nhPlanDrinks, setNhPlanDrinks] = useState(false);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const nhActive = !!getNomihodaiForTable(session, tableLabel)?.active;

  useEffect(() => {
    setNhPlanDrinks(nhActive);
  }, [tableLabel, nhActive]);

  const menuCatalog = useMemo(
    () =>
      buildHandyMenuCatalog({
        drinkSections,
        sideDishSections,
        nomihodaiCatalog,
        takeoutSections: sectionsForDisplay,
      }),
    [drinkSections, sideDishSections, nomihodaiCatalog, sectionsForDisplay],
  );

  const quickItems = useMemo(() => {
    const recentPicks = recentIds.length ? recentIds : loadHandyRecentPicks(menuCatalog.allItems);
    return buildHandyQuickItems(menuCatalog.allItems, recentPicks);
  }, [menuCatalog.allItems, recentIds]);

  useEffect(() => {
    setRecentIds(loadHandyRecentPicks(menuCatalog.allItems));
  }, [menuCatalog.allItems]);

  const trimmedSearch = searchQuery.trim();
  const isSearching = searchOpen && trimmedSearch.length > 0;

  const searchResults = useMemo(
    () => (isSearching ? searchHandyMenuItems(menuCatalog.allItems, trimmedSearch, { limit: 24 }) : []),
    [isSearching, menuCatalog.allItems, trimmedSearch],
  );

  const browseSections = useMemo(
    () =>
      groupId === 'custom' ||
      groupId === 'quick' ||
      groupId === 'aburasoba' ||
      groupId === 'sweets' ||
      groupId === 'drink' ||
      groupId === 'retail' ||
      groupId === 'nomihodai'
        ? []
        : getHandySectionsForGroup(menuCatalog.sections, groupId),
    [groupId, menuCatalog.sections],
  );

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartLines.reduce((s, l) => s + l.qty, 0), [cartLines]);
  const subtotal = useMemo(
    () => cartLines.reduce((s, l) => s + (l.nhPlanFree ? 0 : Math.max(0, Number(l.price) || 0)) * l.qty, 0),
    [cartLines],
  );

  const getQty = useCallback(
    (pick) => {
      const key = resolveHandyPickKey(pick, nhActive, nhPlanDrinks);
      return cart[key]?.qty ?? 0;
    },
    [cart, nhActive, nhPlanDrinks],
  );

  const showToast = useCallback((text) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 900);
  }, []);

  const selectTable = useCallback((lbl) => {
    setTableLabel(lbl);
    persistTableLabelFromApp(lbl);
    setError(null);
  }, []);

  const addPick = useCallback(
    (pick, addQty = 1) => {
      const qtyDelta = Math.max(1, Math.floor(Number(addQty) || 1));
      const isDrink = pick.kind === 'drink';
      const nhPlanFree = !!pick.forceNh || (nhActive && nhPlanDrinks && isDrink);
      const key = resolveHandyPickKey(pick, nhActive, nhPlanDrinks);
      setCart((prev) => {
        const cur = prev[key];
        return {
          ...prev,
          [key]: {
            key,
            itemId: pick.itemId,
            itemName: pick.itemName,
            price: pick.price,
            kind: pick.kind || 'other',
            isNomihodai: nhPlanFree,
            nhPlanFree,
            qty: (cur?.qty ?? 0) + qtyDelta,
          },
        };
      });
      pushHandyRecentPick(pick);
      setRecentIds(loadHandyRecentPicks());
      setError(null);
      const label = String(pick.itemName).split('\n')[0];
      showToast(qtyDelta > 1 ? `＋ ${label} ×${qtyDelta}` : `＋ ${label}`);
    },
    [nhActive, nhPlanDrinks, showToast],
  );

  const removePick = useCallback(
    (pick) => {
      const key = resolveHandyPickKey(pick, nhActive, nhPlanDrinks);
      setCart((prev) => {
        const cur = prev[key];
        if (!cur) return prev;
        const nextQty = cur.qty - 1;
        if (nextQty <= 0) {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        }
        return { ...prev, [key]: { ...cur, qty: nextQty } };
      });
    },
    [nhActive, nhPlanDrinks],
  );

  const addCustomPick = useCallback(
    (name, priceValue, meta = {}) => {
      const trimmed = String(name ?? '').trim();
      const fallback = String(meta.defaultName ?? '').trim();
      const itemName = trimmed || fallback;
      if (!itemName) {
        setError('品名を入力してください');
        return false;
      }
      const price = Math.max(0, Math.floor(Number(priceValue) || 0));
      if (price <= 0 && !(nhActive && nhPlanDrinks)) {
        setError('価格を入力してください');
        return false;
      }
      addPick({
        itemId: `staff-custom-${Date.now()}`,
        itemName,
        price,
        kind: meta.kind || 'other',
        groupId: meta.groupId,
      });
      setError(null);
      return true;
    },
    [addPick, nhActive, nhPlanDrinks],
  );

  const addCustomLine = useCallback(() => {
    if (addCustomPick(customName, customPrice)) {
      setCustomName('');
      setCustomPrice('');
    }
  }, [addCustomPick, customName, customPrice]);

  const changeQty = useCallback((key, delta) => {
    setCart((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const nextQty = cur.qty + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: { ...cur, qty: nextQty } };
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const submit = async () => {
    if (!cartLines.length || busy) return;
    setBusy(true);
    setError(null);
    const status = flow === 'slip' ? 'served' : 'pending';
    const rows = [];
    cartLines.forEach((l) => {
      for (let i = 0; i < l.qty; i += 1) {
        rows.push({
          itemId: l.itemId,
          itemName: l.itemName,
          itemPrice: l.price,
          isNomihodai: l.isNomihodai,
          kind: l.kind,
          nhPlanFree: l.nhPlanFree,
        });
      }
    });
    const r = await addStaffOrdersForTable(tableLabel, rows, { status, isNomihodai: false });
    setBusy(false);
    if (!r?.ok) {
      setError(r?.errorMessage || '送信に失敗しました');
      return;
    }
    showToast(`卓${tableLabel}へ${r.count}品送信`);
    clearCart();
    setCartOpen(false);
  };

  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissingScreen />;
  }

  const renderItemList = (items, { compact = false } = {}) => (
    <div className="handy-rows">
      {items.map((pick) => (
        <HandyItemRow
          key={`${pick.itemId}-${pick.groupId}`}
          pick={pick}
          qty={getQty(pick)}
          nhActive={nhActive}
          nhPlanDrinks={nhPlanDrinks}
          compact={compact}
          onAdd={addPick}
          onRemove={removePick}
        />
      ))}
    </div>
  );

  return (
    <div className="handy-app handy-app--fast">
      <SupabaseConnectionBanner variant="kitchen" />

      <header className="handy-toolbar" aria-label="卓番と送信先">
        <div className="handy-toolbar__tables" role="group" aria-label="卓番号">
          {TABLE_LABELS.map((l) => (
            <button
              key={l}
              type="button"
              className={`handy-toolbar__table${tableLabel === l ? ' is-active' : ''}`}
              onClick={() => selectTable(l)}
              aria-pressed={tableLabel === l}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="handy-toolbar__actions">
          <div className="handy-toolbar__flow" role="group" aria-label="登録先">
            <button
              type="button"
              className={`handy-toolbar__chip${flow === 'kitchen' ? ' is-active' : ''}`}
              onClick={() => setFlow('kitchen')}
              aria-pressed={flow === 'kitchen'}
            >
              厨房
            </button>
            <button
              type="button"
              className={`handy-toolbar__chip${flow === 'slip' ? ' is-active' : ''}`}
              onClick={() => setFlow('slip')}
              aria-pressed={flow === 'slip'}
            >
              伝票
            </button>
          </div>
          {nhActive ? (
            <label className="handy-toolbar__nh">
              <input type="checkbox" checked={nhPlanDrinks} onChange={(e) => setNhPlanDrinks(e.target.checked)} />
              NH
            </label>
          ) : null}
          <button
            type="button"
            className={`handy-toolbar__search-toggle${searchOpen ? ' is-active' : ''}`}
            onClick={() => setSearchOpen((o) => !o)}
            aria-expanded={searchOpen}
          >
            検索
          </button>
        </div>
      </header>

      {searchOpen ? (
        <div className="handy-search-wrap handy-search-wrap--compact">
          <label className="handy-search">
            <input
              type="search"
              className="handy-search__input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="枝豆、ハイボ、並…"
              autoComplete="off"
              autoFocus
              enterKeyHint="search"
            />
            {searchQuery ? (
              <button type="button" className="handy-search__clear" onClick={() => setSearchQuery('')} aria-label="クリア">
                ×
              </button>
            ) : null}
          </label>
        </div>
      ) : null}

      {!isSearching ? (
        <nav className="handy-cats handy-cats--sticky" aria-label="カテゴリ">
          <button
            type="button"
            className={`handy-cats__btn${groupId === 'quick' ? ' is-active' : ''}`}
            onClick={() => setGroupId('quick')}
            aria-pressed={groupId === 'quick'}
          >
            クイック
          </button>
          {HANDY_MENU_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`handy-cats__btn${groupId === g.id ? ' is-active' : ''}`}
              onClick={() => setGroupId(g.id)}
              aria-pressed={groupId === g.id}
            >
              {g.label}
            </button>
          ))}
          <button
            type="button"
            className={`handy-cats__btn${groupId === 'custom' ? ' is-active' : ''}`}
            onClick={() => setGroupId('custom')}
            aria-pressed={groupId === 'custom'}
          >
            手入力
          </button>
        </nav>
      ) : null}

      <main className="handy-main">
        {isSearching ? (
          <>
            <p className="handy-main__lead">「{trimmedSearch}」— 行をタップで追加</p>
            {searchResults.length === 0 ? (
              <p className="handy-grid__empty">該当なし</p>
            ) : (
              renderItemList(searchResults)
            )}
          </>
        ) : groupId === 'quick' ? (
          <>
            <button type="button" className="handy-abu-entry" onClick={() => setGroupId('aburasoba')}>
              <span className="handy-abu-entry__title">＋ 油そばを注文</span>
              <span className="handy-abu-entry__sub">種類 → サイズ → トッピング → 数量</span>
            </button>
            <p className="handy-main__lead">直近 — 左タップまたは＋で追加</p>
            {quickItems.length === 0 ? (
              <p className="handy-grid__empty">まだ履歴がありません。各タブから追加するとここに並びます。</p>
            ) : (
              renderItemList(quickItems, { compact: true })
            )}
          </>
        ) : groupId === 'aburasoba' ? (
          <HandyAburasobaBuilder onAdd={addPick} onAddToppingOnly={addPick} />
        ) : groupId === 'sweets' ? (
          <HandySweetsBrowser renderItemList={renderItemList} onAddCustomPick={addCustomPick} />
        ) : groupId === 'drink' ? (
          <HandyDrinkBrowser renderItemList={renderItemList} />
        ) : groupId === 'retail' ? (
          <HandyRetailBrowser renderItemList={renderItemList} />
        ) : groupId === 'nomihodai' ? (
          <HandyNomihodaiBrowser renderItemList={renderItemList} />
        ) : groupId === 'custom' ? (
          <div className="handy-custom">
            <label className="handy-custom__field">
              <span>品名</span>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="品名"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustomLine();
                }}
              />
            </label>
            <label className="handy-custom__field handy-custom__field--inline">
              <span>価格</span>
              <input
                type="number"
                inputMode="numeric"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0"
                min={0}
                step={10}
              />
            </label>
            <button type="button" className="handy-custom__add" onClick={addCustomLine}>
              追加
            </button>
          </div>
        ) : (
          <div className="handy-sections">
            {browseSections.map((section) => (
              <section key={section.id} className="handy-section">
                <h2 className="handy-section__title">{section.title}</h2>
                {renderItemList(section.items)}
              </section>
            ))}
          </div>
        )}

        {toast ? (
          <p className="handy-toast" role="status">
            {toast}
          </p>
        ) : null}
        {error ? (
          <p className="handy-error" role="alert">
            {error}
          </p>
        ) : null}
      </main>

      <footer className="handy-foot handy-foot--fast">
        {cartCount > 0 ? (
          <div className="handy-foot__chips" aria-label="注文カート">
            {cartLines.map((l) => (
              <button key={l.key} type="button" className="handy-foot__chip" onClick={() => setCartOpen(true)}>
                {l.itemName.split('\n')[0].length > 8
                  ? `${l.itemName.split('\n')[0].slice(0, 8)}…`
                  : l.itemName.split('\n')[0]}{' '}
                ×{l.qty}
              </button>
            ))}
          </div>
        ) : null}
        <div className="handy-foot__bar">
          <button type="button" className="handy-foot__summary" onClick={() => setCartOpen(true)} disabled={cartCount === 0}>
            <strong>{cartCount}品</strong>
            <span>￥{subtotal.toLocaleString()}</span>
            <small>卓{tableLabel}</small>
          </button>
          <button type="button" className="handy-foot__send" disabled={busy || cartCount === 0} onClick={submit}>
            {busy ? '…' : '送信'}
          </button>
        </div>
      </footer>

      {cartOpen ? (
        <div className="handy-cart-overlay" role="dialog" aria-modal="true" aria-label="注文カート">
          <button type="button" className="handy-cart-overlay__backdrop" aria-label="閉じる" onClick={() => setCartOpen(false)} />
          <div className="handy-cart-sheet">
            <header className="handy-cart-sheet__head">
              <h2>カート</h2>
              <button type="button" className="handy-cart-sheet__close" onClick={() => setCartOpen(false)} aria-label="閉じる">
                ×
              </button>
            </header>
            <ul className="handy-cart-sheet__list">
              {cartLines.map((l) => (
                <li key={l.key} className="handy-cart-sheet__row">
                  <span className="handy-cart-sheet__name">{l.itemName}</span>
                  <div className="handy-cart-sheet__qty">
                    <button type="button" onClick={() => changeQty(l.key, -1)} aria-label="減らす">
                      −
                    </button>
                    <span>{l.qty}</span>
                    <button type="button" onClick={() => changeQty(l.key, 1)} aria-label="増やす">
                      ＋
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="handy-cart-sheet__foot">
              <button type="button" className="handy-cart-sheet__clear" onClick={clearCart}>
                空に
              </button>
              <button type="button" className="handy-cart-sheet__send" disabled={busy} onClick={submit}>
                送信
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
