import React, { useState } from 'react';
import DailyLedgerDashboard from './DailyLedgerDashboard.jsx';
import OwnerSalesCalendar from './OwnerSalesCalendar.jsx';
import MasterOpsPanel from './MasterOpsPanel.jsx';
import { MasterDrinkMenuPanel, MasterNomihodaiMenuPanel } from './MasterMenuPanels.jsx';
import { useMasterMenuEditor } from './useMasterMenuEditor.js';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import StoreEntryUrlsPanel from './StoreEntryUrlsPanel.jsx';

export default function MasterMenuPage() {
  const editor = useMasterMenuEditor();
  const {
    guestNomihodaiIntentLabels,
    session,
    nomihodaiActive,
    countdown,
    pendingNomihodaiCount,
  } = useNomihodaiSession();

  const [activeMode, setActiveMode] = useState('drink');

  const kitchenHref = `${String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}kitchen.html`;

  const catPrefix = activeMode === 'drink' ? 'master-cat-drink' : 'master-cat-nh';
  const catList = activeMode === 'drink' ? editor.drinkSections : activeMode === 'nomihodai' ? editor.nomihodaiCatalog : [];

  return (
    <main className="main-content master-page">
      <div className="master-page-inner master-owner-shell">
        {guestNomihodaiIntentLabels.length > 0 && (
          <div className="master-intent-banner" role="status">
            <strong>卓{guestNomihodaiIntentLabels.join('・')}：客席から飲み放題の希望があります。</strong>
            厨房の「各卓・伝票」タブで該当卓が強調されます。人数を確認して「飲み放題開始」を押してください。
            <a href={kitchenHref} className="master-intent-banner__link" target="_blank" rel="noopener noreferrer">
              厨房画面を開く
            </a>
          </div>
        )}

        <header className="master-page-header master-page-header--owner">
          <h1 className="master-page-title">オーナー専用コーナー</h1>
          <p className="master-page-lead">
            左ナビ先頭の「3つの画面」で客席・厨房・オーナーのURLを開けます。メニュー編集はカテゴリから該当ブロックへジャンプ。オーダー・提供は厨房、卓まわりの数字は「卓・売上サマリー」からどうぞ。
          </p>
        </header>

        <div className="master-owner-grid">
          <aside className="master-owner-aside" aria-label="オーナーメニュー">
            <div className="master-owner-aside__brand">
              <span className="master-owner-aside__badge">店舗用</span>
              <p className="master-owner-aside__brand-text">横長ディスプレイ想定・左ナビ</p>
            </div>

            <StoreEntryUrlsPanel variant="master" />

            <div className="master-owner-aside__group">
              <h2 className="master-owner-aside__heading">メニュー編集</h2>
              <div className="master-owner-aside__modes">
                <button
                  type="button"
                  className={`master-owner-mode${activeMode === 'drink' ? ' master-owner-mode--active' : ''}`}
                  onClick={() => setActiveMode('drink')}
                >
                  ドリンクメニュー
                </button>
                <button
                  type="button"
                  className={`master-owner-mode${activeMode === 'nomihodai' ? ' master-owner-mode--active' : ''}`}
                  onClick={() => setActiveMode('nomihodai')}
                >
                  飲み放題（プラン内）
                </button>
              </div>
            </div>

            {(activeMode === 'drink' || activeMode === 'nomihodai') && (
              <nav className="master-owner-catnav" aria-label="カテゴリ一覧">
                <h3 className="master-owner-catnav__title">カテゴリ</h3>
                {catList.length === 0 ? (
                  <p className="master-owner-catnav__empty">カテゴリがありません。「カテゴリを追加」から作成してください。</p>
                ) : (
                  <ul className="master-owner-catlist">
                    {catList.map((sec) => (
                      <li key={sec.id}>
                        <a className="master-owner-catlink" href={`#${catPrefix}-${sec.id}`}>
                          <span className="master-owner-catlink__ja">{sec.titleJa || '（無題）'}</span>
                          {sec.titleEn ? (
                            <span className="master-owner-catlink__en">{sec.titleEn}</span>
                          ) : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </nav>
            )}

            <div className="master-owner-aside__group master-owner-aside__group--spaced">
              <h2 className="master-owner-aside__heading">オーダー管理・売上</h2>
              <a
                href={kitchenHref}
                className="master-owner-kitchen-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                スタッフ・オーダー画面を開く
              </a>
              <button
                type="button"
                className={`master-owner-mode master-owner-mode--sub${activeMode === 'ops' ? ' master-owner-mode--active' : ''}`}
                onClick={() => setActiveMode('ops')}
              >
                卓・売上サマリー
              </button>
              <button
                type="button"
                className={`master-owner-mode master-owner-mode--sub${activeMode === 'ledger' ? ' master-owner-mode--active' : ''}`}
                onClick={() => setActiveMode('ledger')}
              >
                日計管理
              </button>
              <button
                type="button"
                className={`master-owner-mode master-owner-mode--sub${activeMode === 'salesCalendar' ? ' master-owner-mode--active' : ''}`}
                onClick={() => setActiveMode('salesCalendar')}
              >
                売上カレンダー
              </button>
            </div>
          </aside>

          <div className="master-owner-main">
            {activeMode === 'drink' && <MasterDrinkMenuPanel {...editor} />}
            {activeMode === 'nomihodai' && <MasterNomihodaiMenuPanel {...editor} />}
            {activeMode === 'ops' && (
              <MasterOpsPanel
                session={session}
                nomihodaiActive={nomihodaiActive}
                countdown={countdown}
                kitchenHref={kitchenHref}
                pendingNomihodaiCount={pendingNomihodaiCount}
              />
            )}
            {activeMode === 'ledger' && <DailyLedgerDashboard />}
            {activeMode === 'salesCalendar' && <OwnerSalesCalendar />}
          </div>
        </div>
      </div>
    </main>
  );
}
