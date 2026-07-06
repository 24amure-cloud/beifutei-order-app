import React, { useCallback, useMemo, useState } from 'react';
import { useMenuMaster } from './MenuMasterContext.jsx';
import { useSideDishMenu } from './SideDishMenuContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { useTakeoutSweetsMenu } from './TakeoutSweetsMenuContext.jsx';
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

function LedgerMenuItemRow({ pick, onAdd }) {
  const soldOut = !!pick.soldOut;
  const price = Math.max(0, Number(pick.price) || 0);
  const priceLabel = price > 0 ? `￥${price.toLocaleString()}` : '単価なし';

  return (
    <div className={`handy-row handy-row--compact${soldOut ? ' handy-row--soldout' : ''}`}>
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
      <button
        type="button"
        className="handy-row__qty-btn handy-row__qty-btn--plus"
        disabled={soldOut}
        onClick={() => onAdd(pick)}
        aria-label={`${pick.itemName}を追加`}
      >
        ＋
      </button>
    </div>
  );
}

/**
 * 手書き後入力用 — ハンディ同様のメニューから明細行へ追加
 * @param {{
 *   onPickLine: (line: { name: string, price: number|string }) => void,
 *   ledgerPresets?: Array<{ name: string, price: number }>,
 * }} props
 */
export default function ManualLedgerMenuPicker({ onPickLine, ledgerPresets = [] }) {
  const { drinkSections } = useMenuMaster();
  const { sideDishSections } = useSideDishMenu();
  const { nomihodaiCatalog } = useNomihodaiCatalog();
  const { takeoutSections } = useTakeoutSweetsMenu();

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
        takeoutSections,
      }),
    [drinkSections, sideDishSections, nomihodaiCatalog, takeoutSections],
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
    () => (groupId && groupId !== 'quick' && groupId !== 'custom' ? getHandySectionsForGroup(menuCatalog.sections, groupId) : []),
    [groupId, menuCatalog.sections],
  );

  const commitPick = useCallback(
    (pick) => {
      const name = String(pick.itemName || '')
        .split('\n')[0]
        .trim();
      if (!name) return;
      const price = Math.max(0, Number(pick.price) || 0);
      onPickLine({ name, price: price > 0 ? price : '' });
      pushHandyRecentPick(pick);
      setRecentTick((x) => x + 1);
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
          <LedgerMenuItemRow key={`${pick.itemId}-${pick.groupId}`} pick={pick} onAdd={commitPick} />
        ))}
      </div>
    ),
    [commitPick],
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
            {ledgerPresetPicks.length > 0 ? (
              <>
                <p className="handy-main__lead manual-ledger-menu-picker__lead">
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
