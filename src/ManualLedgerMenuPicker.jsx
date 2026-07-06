import React, { useCallback, useMemo, useState } from 'react';
import { useSideDishMenu } from './SideDishMenuContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { useDrinkMenuForGuest } from './useDrinkMenuForGuest.js';
import { useTakeoutSweetsDisplay } from './useTakeoutSweetsDisplay.js';
import {
  HANDY_MENU_GROUPS,
  buildHandyMenuCatalog,
  buildHandyQuickItems,
  getHandySectionsForGroup,
  loadHandyRecentPicks,
  pushHandyRecentPick,
  searchHandyMenuItems,
} from './handyMenuCatalog.js';
import HandyAburasobaBuilder from './HandyAburasobaBuilder.jsx';
import HandySweetsBrowser from './HandySweetsBrowser.jsx';
import HandyDrinkBrowser from './HandyDrinkBrowser.jsx';
import HandyNomihodaiBrowser from './HandyNomihodaiBrowser.jsx';
import HandyRetailBrowser from './HandyRetailBrowser.jsx';
import { MANUAL_LEDGER_FIXED_EXTRAS } from './manualLedgerFixedExtras.js';

function LedgerMenuItemRow({ pick, qty = 0, onAdd, onRemove }) {
  const soldOut = !!pick.soldOut;
  const price = Math.max(0, Number(pick.price) || 0);
  const priceLabel = price > 0 ? `￥${price.toLocaleString()}` : '単価なし';

  return (
    <div
      className={`handy-row handy-row--compact${qty > 0 ? ' handy-row--in-cart' : ''}${soldOut ? ' handy-row--soldout' : ''}`}
    >
      <button
        type="button"
        className="handy-row__main"
        disabled={soldOut}
        onClick={() => onAdd(pick)}
        aria-label={`${pick.itemName}を明細に追加`}
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
          disabled={qty <= 0 || soldOut}
          onClick={() => onRemove(pick)}
          aria-label={`${pick.itemName}を1つ減らす`}
        >
          −
        </button>
        <span className="handy-row__qty-num">{qty || ''}</span>
        <button
          type="button"
          className="handy-row__qty-btn handy-row__qty-btn--plus"
          disabled={soldOut}
          onClick={() => onAdd(pick)}
          aria-label={`${pick.itemName}を1つ増やす`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

/**
 * 手書き後入力用 — ハンディ同様のメニューから明細行へ追加
 * @param {{
 *   onPickLine: (line: { name: string, price: number|string, delta?: number }) => void,
 *   ledgerPresets?: Array<{ name: string, price: number }>,
 *   getPickQty?: (name: string, price: number|string) => number,
 * }} props
 */
export default function ManualLedgerMenuPicker({ onPickLine, ledgerPresets = [], getPickQty }) {
  const drinkSections = useDrinkMenuForGuest();
  const { sideDishSections } = useSideDishMenu();
  const { nomihodaiCatalog } = useNomihodaiCatalog();
  const { sectionsForDisplay } = useTakeoutSweetsDisplay();

  const [groupId, setGroupId] = useState('quick');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTick, setRecentTick] = useState(0);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

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

  const trimmedSearch = searchQuery.trim();
  const isSearching = searchOpen && trimmedSearch.length > 0;
  const searchResults = useMemo(
    () => (isSearching ? searchHandyMenuItems(menuCatalog.allItems, trimmedSearch) : []),
    [isSearching, menuCatalog.allItems, trimmedSearch],
  );

  const recentPicks = useMemo(
    () => loadHandyRecentPicks(menuCatalog.allItems),
    [menuCatalog.allItems, recentTick],
  );

  const quickItems = useMemo(
    () => buildHandyQuickItems(menuCatalog.allItems, recentPicks),
    [menuCatalog.allItems, recentPicks],
  );

  const ledgerPresetKey = useCallback((name, price) => {
    const n = String(name || '').trim();
    const p = Math.max(0, Math.round(Number(price) || 0));
    return `${n}\0${p}`;
  }, []);

  const ledgerPresetKeys = useMemo(
    () => new Set((ledgerPresets || []).map((row) => ledgerPresetKey(row.name, row.price))),
    [ledgerPresets, ledgerPresetKey],
  );

  const ledgerPresetPicks = useMemo(
    () =>
      (ledgerPresets || []).map((row, index) => ({
        itemId: `ledger-preset-${index}-${row.name}`,
        itemName: row.name,
        price: row.price,
        kind: 'other',
        groupId: 'ledger-preset',
      })),
    [ledgerPresets],
  );

  const quickItemsWithoutLedgerDupes = useMemo(
    () =>
      quickItems.filter(
        (pick) => !ledgerPresetKeys.has(ledgerPresetKey(pick.itemName, pick.price)),
      ),
    [quickItems, ledgerPresetKeys, ledgerPresetKey],
  );

  const browseSections = useMemo(
    () =>
      groupId && groupId !== 'quick' && groupId !== 'custom' && groupId !== 'retail'
        ? getHandySectionsForGroup(menuCatalog.sections, groupId)
        : [],
    [groupId, menuCatalog.sections],
  );

  const commitPick = useCallback(
    (pick, delta = 1) => {
      const name = String(pick.itemName || '')
        .split('\n')[0]
        .trim();
      if (!name) return;
      const price = Math.max(0, Number(pick.price) || 0);
      onPickLine({ name, price: price > 0 ? price : '', delta });
      if (delta > 0) {
        pushHandyRecentPick(pick);
        setRecentTick((x) => x + 1);
      }
    },
    [onPickLine],
  );

  const addCustomLine = useCallback(() => {
    const name = String(customName || '').trim();
    const price = Math.max(0, Math.floor(Number(customPrice) || 0));
    if (!name) return;
    if (price <= 0) return;
    commitPick({
      itemId: `ledger-custom-${Date.now()}`,
      itemName: name,
      price,
      kind: 'other',
      groupId: 'custom',
    });
    setCustomName('');
    setCustomPrice('');
  }, [commitPick, customName, customPrice]);

  const renderItemList = useCallback(
    (items) => (
      <div className="handy-rows">
        {(items || []).map((pick) => (
          <LedgerMenuItemRow
            key={`${pick.itemId}-${pick.groupId}`}
            pick={pick}
            qty={getPickQty ? getPickQty(pick.itemName, pick.price) : 0}
            onAdd={(p) => commitPick(p, 1)}
            onRemove={(p) => commitPick(p, -1)}
          />
        ))}
      </div>
    ),
    [commitPick, getPickQty],
  );

  const fixedExtraPicks = useMemo(
    () =>
      MANUAL_LEDGER_FIXED_EXTRAS.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        price: item.price,
        kind: item.kind,
        groupId: item.groupId,
        sectionTitle: item.sectionTitle,
      })),
    [],
  );

  return (
    <div className="manual-ledger-menu-picker">
      <div className="manual-ledger-menu-picker__toolbar">
        <button
          type="button"
          className={`manual-ledger-menu-picker__search${searchOpen ? ' is-active' : ''}`}
          onClick={() => setSearchOpen((o) => !o)}
          aria-expanded={searchOpen}
        >
          検索
        </button>
      </div>

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
              enterKeyHint="search"
            />
            {searchQuery ? (
              <button
                type="button"
                className="handy-search__clear"
                onClick={() => setSearchQuery('')}
                aria-label="クリア"
              >
                ×
              </button>
            ) : null}
          </label>
        </div>
      ) : null}

      {!isSearching ? (
        <nav className="handy-cats manual-ledger-menu-picker__cats" aria-label="明細カテゴリ">
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

      <div className="manual-ledger-menu-picker__body">
        {isSearching ? (
          <>
            <p className="handy-main__lead">「{trimmedSearch}」— タップで明細に追加</p>
            {searchResults.length === 0 ? (
              <p className="handy-grid__empty">該当なし</p>
            ) : (
              renderItemList(searchResults)
            )}
          </>
        ) : groupId === 'quick' ? (
          <>
            <button type="button" className="handy-abu-entry" onClick={() => setGroupId('aburasoba')}>
              <span className="handy-abu-entry__title">＋ 油そば</span>
              <span className="handy-abu-entry__sub">種類・サイズ・トッピング</span>
            </button>
            <p className="handy-main__lead manual-ledger-menu-picker__lead">追加項目 — タップで追加</p>
            {renderItemList(fixedExtraPicks)}
            {ledgerPresetPicks.length > 0 ? (
              <>
                <p className="handy-main__lead manual-ledger-menu-picker__lead manual-ledger-menu-picker__lead--section">
                  この画面で登録した控え — タップで追加
                </p>
                {renderItemList(ledgerPresetPicks)}
              </>
            ) : null}
            <p
              className={`handy-main__lead manual-ledger-menu-picker__lead${ledgerPresetPicks.length > 0 ? ' manual-ledger-menu-picker__lead--section' : ''}`}
            >
              {ledgerPresetPicks.length > 0 ? 'メニューでよく使う品' : '直近・よく使う品'} — タップで追加
            </p>
            {quickItemsWithoutLedgerDupes.length === 0 ? (
              <p className="handy-grid__empty">
                {ledgerPresetPicks.length > 0
                  ? 'メニューから追加すると、ここにも並びます。'
                  : 'まだ履歴がありません。各タブから追加するとここに並びます。'}
              </p>
            ) : (
              renderItemList(quickItemsWithoutLedgerDupes)
            )}
          </>
        ) : groupId === 'aburasoba' ? (
          <HandyAburasobaBuilder onAdd={commitPick} onAddToppingOnly={commitPick} />
        ) : groupId === 'sweets' ? (
          <HandySweetsBrowser
            renderItemList={renderItemList}
            onAddCustomPick={(name, priceValue) => {
              const n = String(name || '').trim();
              const p = Math.max(0, Math.floor(Number(priceValue) || 0));
              if (!n || p <= 0) return false;
              commitPick({ itemId: `ledger-sweets-${Date.now()}`, itemName: n, price: p, kind: 'food', groupId: 'sweets' });
              return true;
            }}
          />
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
              明細に追加
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
      </div>
    </div>
  );
}
