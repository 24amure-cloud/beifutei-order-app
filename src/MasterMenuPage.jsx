import React, { useEffect, useState } from 'react';
import { pullAndMergeDailyLedgerFromSupabase } from './dailyLedgerSync.js';
import DailyLedgerDashboard from './DailyLedgerDashboard.jsx';
import OwnerSalesCalendar from './OwnerSalesCalendar.jsx';
import MonthClosePanel from './MonthClosePanel.jsx';
import MasterOpsPanel from './MasterOpsPanel.jsx';
import {
  MasterDrinkMenuPanel,
  MasterNomihodaiMenuPanel,
  MasterTakeoutMenuPanel,
  MasterSideDishMenuPanel,
  MasterGlobalApplyBar,
} from './MasterMenuPanels.jsx';
import { useMasterMenuEditor } from './useMasterMenuEditor.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getLocalDateKey } from './dailyLedger.js';
import { sideDishSectionNavLabel } from './sideDishMenuLabels.js';

const MENU_MODES = ['drink', 'nomihodai', 'takeout', 'sidedish'];
const MENU_LABELS = {
  drink: 'ドリンク',
  nomihodai: '飲み放題',
  takeout: 'テイクアウト',
  sidedish: 'サイド',
};

const MAIN_TABS = [
  { id: 'ops', label: '本日の売上' },
  { id: 'ledger', label: '日計' },
  { id: 'salesCalendar', label: '売上カレンダー' },
  { id: 'monthClose', label: '月締め' },
  { id: 'menu', label: 'メニュー編集', isMenu: true },
];

function isMenuMode(mode) {
  return MENU_MODES.includes(mode);
}

function todayLabel() {
  try {
    return new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return getLocalDateKey();
  }
}

export default function MasterMenuPage() {
  const editor = useMasterMenuEditor();
  const { guestNomihodaiIntentLabels } = useNomihodaiSession();

  const [activeMode, setActiveMode] = useState('ops');
  const [lastMenuMode, setLastMenuMode] = useState('drink');

  useEffect(() => {
    pullAndMergeDailyLedgerFromSupabase();
  }, []);

  const requestActiveMode = (mode) => {
    if (mode === activeMode) return;
    if (activeMode === 'drink' && editor.drinkDirty && mode !== 'drink') {
      if (!window.confirm('ドリンクの変更がまだ反映されていません。このまま移動しますか？')) return;
    }
    if (activeMode === 'nomihodai' && editor.nhDirty && mode !== 'nomihodai') {
      if (!window.confirm('飲み放題の変更がまだ反映されていません。このまま移動しますか？')) return;
    }
    if (activeMode === 'takeout' && editor.takeoutDirty && mode !== 'takeout') {
      if (!window.confirm('テイクアウトの変更がまだ反映されていません。このまま移動しますか？')) return;
    }
    if (activeMode === 'sidedish' && editor.sideDishDirty && mode !== 'sidedish') {
      if (!window.confirm('サイドメニューの変更がまだ反映されていません。このまま移動しますか？')) return;
    }
    if (isMenuMode(mode)) setLastMenuMode(mode);
    setActiveMode(mode);
  };

  const onMainTab = (tab) => {
    if (tab.isMenu) {
      requestActiveMode(lastMenuMode);
      return;
    }
    requestActiveMode(tab.id);
  };

  const kitchenHref = `${String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}kitchen.html`;
  const menuMode = isMenuMode(activeMode) ? activeMode : lastMenuMode;
  const catPrefix =
    menuMode === 'drink'
      ? 'master-cat-drink'
      : menuMode === 'nomihodai'
        ? 'master-cat-nh'
        : menuMode === 'takeout'
          ? 'master-cat-takeout'
          : 'master-cat-sidedish';
  const catList =
    menuMode === 'drink'
      ? editor.drinkSections
      : menuMode === 'nomihodai'
        ? editor.nomihodaiCatalog
        : menuMode === 'takeout'
          ? editor.takeoutSections
          : editor.sideDishSections;

  const tabActive = (tab) =>
    tab.isMenu ? isMenuMode(activeMode) : activeMode === tab.id;

  return (
    <main className="main-content master-page master-page--president">
      <div className="master-page-inner master-owner-shell master-owner-shell--president">
        {guestNomihodaiIntentLabels.length > 0 && (
          <div className="master-president-alert" role="alert">
            <strong>卓 {guestNomihodaiIntentLabels.join('・')}</strong>
            <span>お客様から飲み放題の希望があります</span>
            <a href={kitchenHref} className="master-president-alert__link" target="_blank" rel="noopener noreferrer">
              厨房で確認
            </a>
          </div>
        )}

        <header className="master-president-header">
          <p className="master-president-header__date">{todayLabel()}</p>
          <h1 className="master-president-header__title">店舗管理</h1>
          <p className="master-president-header__lead">数字の確認とメニュー変更ができます。日常の確認は「本日の売上」からどうぞ。</p>
        </header>

        <nav className="master-president-tabs" aria-label="メイン">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`master-president-tab${tabActive(tab) ? ' master-president-tab--active' : ''}`}
              onClick={() => onMainTab(tab)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="master-owner-grid master-owner-grid--president">
          <aside className="master-owner-aside master-owner-aside--president" aria-label="よく使う操作">
            <a
              href={kitchenHref}
              className="master-president-kitchen"
              target="_blank"
              rel="noopener noreferrer"
            >
              厨房・スタッフ画面を開く
            </a>

            {!isMenuMode(activeMode) && (
              <div className="master-president-aside-hint">
                <p>過去の売上は「日計」「売上カレンダー」タブでご確認ください。</p>
              </div>
            )}

            {isMenuMode(activeMode) && (
              <>
                <div className="master-owner-aside__group">
                  <h2 className="master-owner-aside__heading">編集するメニュー</h2>
                  <MasterGlobalApplyBar
                    anyMenuDirty={editor.anyMenuDirty}
                    allApplyNotice={editor.allApplyNotice}
                    applyAllMenus={editor.applyAllMenus}
                    discardAllDrafts={editor.discardAllDrafts}
                  />
                  <div className="master-owner-aside__modes">
                    {MENU_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`master-owner-mode${activeMode === m ? ' master-owner-mode--active' : ''}`}
                        onClick={() => requestActiveMode(m)}
                      >
                        {MENU_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
                {catList.length > 0 && (
                  <nav className="master-owner-catnav" aria-label="カテゴリ">
                    <h3 className="master-owner-catnav__title">ジャンプ</h3>
                    <ul className="master-owner-catlist">
                      {catList.map((sec) => (
                        <li key={sec.id}>
                          <a className="master-owner-catlink" href={`#${catPrefix}-${sec.id}`}>
                            {activeMode === 'sidedish'
                              ? sideDishSectionNavLabel(sec)
                              : sec.titleJa || '（無題）'}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </>
            )}
          </aside>

          <div className="master-owner-main master-owner-main--president">
            {activeMode === 'ops' && (
              <>
                <MasterOpsPanel
                  kitchenHref={kitchenHref}
                  showKitchenLink={false}
                  onOpenLedger={() => requestActiveMode('ledger')}
                  onOpenCalendar={() => requestActiveMode('salesCalendar')}
                />
              </>
            )}
            {activeMode === 'ledger' && <DailyLedgerDashboard />}
            {activeMode === 'salesCalendar' && <OwnerSalesCalendar />}
            {activeMode === 'monthClose' && <MonthClosePanel />}
            {activeMode === 'drink' && <MasterDrinkMenuPanel {...editor} />}
            {activeMode === 'nomihodai' && <MasterNomihodaiMenuPanel {...editor} />}
            {activeMode === 'takeout' && <MasterTakeoutMenuPanel {...editor} />}
            {activeMode === 'sidedish' && <MasterSideDishMenuPanel {...editor} />}
          </div>
        </div>
      </div>
    </main>
  );
}
