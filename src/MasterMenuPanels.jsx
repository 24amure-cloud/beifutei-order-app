import React from 'react';
import {
  MASTER_MENU_APPLY_HINT_CLEAN,
  MASTER_MENU_APPLY_HINT_DIRTY,
  MASTER_MENU_APPLIED_LABEL,
  MASTER_MENU_APPLY_LABEL,
} from './masterMenuApplyCopy.js';

/** ドリンク・飲み放題・テイクアウト・サイドの未反映分をまとめて客席・スタッフへ反映 */
export function MasterGlobalApplyBar({ anyMenuDirty, allApplyNotice, applyAllMenus, discardAllDrafts }) {
  return (
    <div
      className={`master-apply-bar master-apply-bar--global${anyMenuDirty ? ' master-apply-bar--dirty' : ''}`}
      role="status"
      aria-live="polite"
    >
      <p className="master-apply-bar__hint">
        {anyMenuDirty
          ? 'ドリンク・飲み放題・テイクアウトスイーツ・サイドのいずれかに未反映の編集があります。まとめて客席タブレット・スタッフ画面へ反映できます。'
          : '4種類のメニューはすべて客席タブレット・スタッフ画面と同期済みです。'}
      </p>
      <div className="master-apply-bar__actions">
        <button type="button" className="master-btn master-btn--apply" disabled={!anyMenuDirty} onClick={applyAllMenus}>
          すべて反映（客席・スタッフ）
        </button>
        <button type="button" className="master-btn master-btn--ghost" disabled={!anyMenuDirty} onClick={discardAllDrafts}>
          すべて破棄
        </button>
        {allApplyNotice === 'ok' ? (
          <span className="master-apply-bar__ok">{MASTER_MENU_APPLIED_LABEL}</span>
        ) : null}
      </div>
    </div>
  );
}

function MasterApplyBar({
  dirty,
  applyNotice,
  onApply,
  onDiscard,
  hintDirty,
  hintClean,
  applyLabel = '客席に反映',
  appliedLabel = '反映しました',
}) {
  return (
    <div className="master-apply-bar" role="status" aria-live="polite">
      <p className="master-apply-bar__hint">
        {dirty
          ? (hintDirty ?? '編集内容はまだ客席タブレットに出ていません。「客席に反映」を押してください。')
          : (hintClean ?? '客席タブレットと同じ内容です。')}
      </p>
      <div className="master-apply-bar__actions">
        <button type="button" className="master-btn master-btn--apply" disabled={!dirty} onClick={onApply}>
          {applyLabel}
        </button>
        <button type="button" className="master-btn master-btn--ghost" disabled={!dirty} onClick={onDiscard}>
          変更を破棄
        </button>
        {applyNotice === 'ok' ? <span className="master-apply-bar__ok">{appliedLabel}</span> : null}
      </div>
    </div>
  );
}

const MENU_APPLY_PROPS = {
  hintDirty: MASTER_MENU_APPLY_HINT_DIRTY,
  hintClean: MASTER_MENU_APPLY_HINT_CLEAN,
  applyLabel: MASTER_MENU_APPLY_LABEL,
  appliedLabel: MASTER_MENU_APPLIED_LABEL,
};

/** ドリンクメニューマスター本体（カード＋全セクション） */
export function MasterDrinkMenuPanel({
  drinkSections,
  drinkDirty,
  drinkApplyNotice,
  applyDrinkMenu,
  discardDrinkDraft,
  addSection,
  onResetDrinkDefaults,
  updateSection,
  removeSection,
  updateItem,
  removeItem,
  addItem,
  catIdPrefix = 'master-cat-drink',
}) {
  return (
    <>
      <section className="master-card">
        <div className="master-card-head">
          <h2 className="master-card-title">ドリンクメニュー</h2>
          <div className="master-toolbar">
            <button type="button" className="master-btn master-btn--primary" onClick={addSection}>
              カテゴリを追加
            </button>
            <button type="button" className="master-btn master-btn--danger" onClick={onResetDrinkDefaults}>
              初期データに戻す
            </button>
          </div>
        </div>

        <MasterApplyBar
          dirty={drinkDirty}
          applyNotice={drinkApplyNotice}
          onApply={applyDrinkMenu}
          onDiscard={discardDrinkDraft}
          {...MENU_APPLY_PROPS}
        />

        <div className="master-sections">
          {drinkSections.map((sec) => (
            <div key={sec.id} id={`${catIdPrefix}-${sec.id}`} className="master-sec master-sec--anchor">
              <div className="master-sec-top">
                <label className="master-field">
                  <span className="master-field-label">英表記</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleEn}
                    onChange={(e) => updateSection(sec.id, { titleEn: e.target.value })}
                  />
                </label>
                <label className="master-field">
                  <span className="master-field-label">日本語</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleJa}
                    onChange={(e) => updateSection(sec.id, { titleJa: e.target.value })}
                  />
                </label>
                <label className="master-field master-field--grow">
                  <span className="master-field-label">注記（任意）</span>
                  <input
                    type="text"
                    className="master-input"
                    placeholder="例：ロック／水割り…"
                    value={sec.hint ?? ''}
                    onChange={(e) => updateSection(sec.id, { hint: e.target.value || undefined })}
                  />
                </label>
                <label className="master-field master-field--grow">
                  <span className="master-field-label">注記・英語（任意）</span>
                  <input
                    type="text"
                    className="master-input"
                    placeholder="e.g. On the rocks / with water"
                    value={sec.hintEn ?? ''}
                    onChange={(e) => updateSection(sec.id, { hintEn: e.target.value || undefined })}
                  />
                </label>
                <label className="master-check">
                  <input
                    type="checkbox"
                    checked={!!sec.twoCols}
                    onChange={(e) => updateSection(sec.id, { twoCols: e.target.checked })}
                  />
                  2列表示
                </label>
                <button type="button" className="master-btn master-btn--ghost" onClick={() => removeSection(sec.id)}>
                  カテゴリ削除
                </button>
              </div>

              <div className="master-table-wrap">
                <table className="master-table">
                  <thead>
                    <tr>
                      <th className="master-th-id">ID（集計用）</th>
                      <th>品名（厨房・伝票）</th>
                      <th>客席英語名（任意）</th>
                      <th className="master-th-price">価格（税込）</th>
                      <th className="master-th-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((it) => (
                      <tr key={`${sec.id}-${it.id}`}>
                        <td>
                          <input
                            type="text"
                            className="master-input master-input--mono"
                            value={it.id}
                            onChange={(e) => updateItem(sec.id, it.id, { id: e.target.value })}
                            title="カートと連動するため、変更後は同一品が別行になることがあります"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input"
                            value={it.name}
                            onChange={(e) => updateItem(sec.id, it.id, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input"
                            value={it.nameEn ?? ''}
                            onChange={(e) => updateItem(sec.id, it.id, { nameEn: e.target.value })}
                            placeholder="Guest EN label"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input master-input--price"
                            inputMode="numeric"
                            placeholder="ASK"
                            value={it.price === null || it.price === undefined ? '' : String(it.price)}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              if (v === '') updateItem(sec.id, it.id, { price: null });
                              else {
                                const n = Number(v);
                                if (!Number.isNaN(n) && Number.isFinite(n)) updateItem(sec.id, it.id, { price: n });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="master-btn master-btn--small"
                            onClick={() => removeItem(sec.id, it.id)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="master-btn master-btn--secondary" onClick={() => addItem(sec.id)}>
                ＋ 品目を追加
              </button>
            </div>
          ))}
        </div>
      </section>
      <p className="master-footnote">※ 価格欄を空にするとメニュー上は ASK（追加ボタンなし）になります。</p>
    </>
  );
}

/** 飲み放題（プラン内）メニューマスター本体 */
export function MasterNomihodaiMenuPanel({
  nomihodaiCatalog,
  nhDirty,
  nhApplyNotice,
  applyNomihodaiMenu,
  discardNomihodaiDraft,
  addNhSection,
  onResetNhDefaults,
  updateNhSection,
  removeNhSection,
  updateNhItem,
  removeNhItem,
  addNhItem,
  catIdPrefix = 'master-cat-nh',
}) {
  return (
    <>
      <section className="master-card">
        <div className="master-card-head">
          <h2 className="master-card-title">飲み放題メニュー（プラン内）</h2>
          <div className="master-toolbar">
            <button type="button" className="master-btn master-btn--primary" onClick={addNhSection}>
              カテゴリを追加
            </button>
            <button type="button" className="master-btn master-btn--danger" onClick={onResetNhDefaults}>
              初期データに戻す
            </button>
          </div>
        </div>

        <MasterApplyBar
          dirty={nhDirty}
          applyNotice={nhApplyNotice}
          onApply={applyNomihodaiMenu}
          onDiscard={discardNomihodaiDraft}
          {...MENU_APPLY_PROPS}
        />

        <p className="master-page-lead master-page-lead--compact">
          飲み放題セッション中の客席「ドリンク」タブに表示される一覧です。単価はプランに含まれるため編集しません。ID
          は厨房・注文行の識別用です（変更すると進行中の注文とずれる場合があります）。「客席英語名」に入力すると卓タブレットが英語表示のときにその表記が使われます（厨房・伝票は「品名」の日本語のまま）。
        </p>

        <div className="master-sections">
          {nomihodaiCatalog.map((sec) => (
            <div key={sec.id} id={`${catIdPrefix}-${sec.id}`} className="master-sec master-sec--anchor">
              <div className="master-sec-top">
                <label className="master-field">
                  <span className="master-field-label">英表記</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleEn}
                    onChange={(e) => updateNhSection(sec.id, { titleEn: e.target.value })}
                  />
                </label>
                <label className="master-field">
                  <span className="master-field-label">日本語</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleJa}
                    onChange={(e) => updateNhSection(sec.id, { titleJa: e.target.value })}
                  />
                </label>
                <button type="button" className="master-btn master-btn--ghost" onClick={() => removeNhSection(sec.id)}>
                  カテゴリ削除
                </button>
              </div>

              <div className="master-table-wrap">
                <table className="master-table master-table--nh">
                  <thead>
                    <tr>
                      <th className="master-th-id">ID（注文・厨房用）</th>
                      <th>品名（厨房・伝票）</th>
                      <th>客席英語名（任意）</th>
                      <th className="master-th-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((it) => (
                      <tr key={`${sec.id}-${it.id}`}>
                        <td>
                          <input
                            type="text"
                            className="master-input master-input--mono"
                            value={it.id}
                            onChange={(e) => updateNhItem(sec.id, it.id, { id: e.target.value })}
                            title="変更すると同一品が別行扱いになることがあります"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input"
                            value={it.name}
                            onChange={(e) => updateNhItem(sec.id, it.id, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input"
                            value={it.nameEn ?? ''}
                            onChange={(e) => updateNhItem(sec.id, it.id, { nameEn: e.target.value })}
                            placeholder="English guest label"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="master-btn master-btn--small"
                            onClick={() => removeNhItem(sec.id, it.id)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="master-btn master-btn--secondary" onClick={() => addNhItem(sec.id)}>
                ＋ 品目を追加
              </button>
            </div>
          ))}
        </div>
      </section>
      <p className="master-footnote">
        ※ 飲み放題の表示・注文は同一オリジンの客席画面のみです。厨房画面とポート番号を揃えてください。
      </p>
    </>
  );
}

/** テイクアウトスイーツ：価格・品目（在庫は厨房スタッフ画面） */
export function MasterTakeoutMenuPanel({
  takeoutSections,
  takeoutDirty,
  takeoutApplyNotice,
  applyTakeoutMenu,
  discardTakeoutDraft,
  addTakeoutSection,
  onResetTakeoutDefaults,
  updateTakeoutSection,
  removeTakeoutSection,
  updateTakeoutItem,
  removeTakeoutItem,
  addTakeoutItem,
  catIdPrefix = 'master-cat-takeout',
}) {
  return (
    <>
      <section className="master-card">
        <div className="master-card-head">
          <h2 className="master-card-title">テイクアウトスイーツ</h2>
          <div className="master-toolbar">
            <button type="button" className="master-btn master-btn--primary" onClick={addTakeoutSection}>
              カテゴリを追加
            </button>
            <button type="button" className="master-btn master-btn--danger" onClick={onResetTakeoutDefaults}>
              初期データに戻す
            </button>
          </div>
        </div>

        <MasterApplyBar
          dirty={takeoutDirty}
          applyNotice={takeoutApplyNotice}
          onApply={applyTakeoutMenu}
          onDiscard={discardTakeoutDraft}
          {...MENU_APPLY_PROPS}
        />

        <p className="master-page-lead master-page-lead--compact">
          カテゴリ名・品目・価格を編集し「メニューを反映」で、客席タブレットと厨房に出ます。
          <strong>在庫の増減・品切れは厨房画面の「スイーツ在庫」タブ</strong>で行います（会計作業と分離）。
        </p>

        <div className="master-sections">
          {takeoutSections.map((sec) => (
            <div key={sec.id} id={`${catIdPrefix}-${sec.id}`} className="master-sec master-sec--anchor">
              <div className="master-sec-top">
                <label className="master-field">
                  <span className="master-field-label">カテゴリ名（日本語）</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleJa ?? ''}
                    onChange={(e) => updateTakeoutSection(sec.id, { titleJa: e.target.value })}
                  />
                </label>
                <label className="master-field">
                  <span className="master-field-label">i18nキー（任意）</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleKey ?? ''}
                    onChange={(e) => updateTakeoutSection(sec.id, { titleKey: e.target.value })}
                    placeholder="ts_section_furusan"
                  />
                </label>
                <button type="button" className="master-btn master-btn--ghost" onClick={() => removeTakeoutSection(sec.id)}>
                  カテゴリ削除
                </button>
              </div>

              <div className="master-table-wrap">
                <table className="master-table">
                  <thead>
                    <tr>
                      <th className="master-th-id">ID</th>
                      <th>品名</th>
                      <th className="master-th-price">価格</th>
                      <th className="master-th-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((it) => (
                      <tr key={`${sec.id}-${it.id}`}>
                        <td>
                          <input
                            type="text"
                            className="master-input master-input--mono"
                            value={it.id}
                            onChange={(e) => updateTakeoutItem(sec.id, it.id, { id: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input"
                            value={it.name}
                            onChange={(e) => updateTakeoutItem(sec.id, it.id, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input master-input--price"
                            inputMode="numeric"
                            value={String(it.price ?? '')}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n) && Number.isFinite(n)) {
                                updateTakeoutItem(sec.id, it.id, { price: n });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="master-btn master-btn--small"
                            onClick={() => removeTakeoutItem(sec.id, it.id)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="master-btn master-btn--secondary" onClick={() => addTakeoutItem(sec.id)}>
                ＋ 品目を追加
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** サイドメニュー */
export function MasterSideDishMenuPanel({
  sideDishSections,
  sideDishDirty,
  sideDishApplyNotice,
  applySideDishMenu,
  discardSideDishDraft,
  addSideDishSection,
  onResetSideDishDefaults,
  updateSideDishSection,
  removeSideDishSection,
  updateSideDishItem,
  removeSideDishItem,
  addSideDishItem,
  catIdPrefix = 'master-cat-sidedish',
}) {
  return (
    <>
      <section className="master-card">
        <div className="master-card-head">
          <h2 className="master-card-title">サイドメニュー</h2>
          <div className="master-toolbar">
            <button type="button" className="master-btn master-btn--primary" onClick={addSideDishSection}>
              ブロックを追加
            </button>
            <button type="button" className="master-btn master-btn--danger" onClick={onResetSideDishDefaults}>
              初期データに戻す
            </button>
          </div>
        </div>

        <MasterApplyBar
          dirty={sideDishDirty}
          applyNotice={sideDishApplyNotice}
          onApply={applySideDishMenu}
          onDiscard={discardSideDishDraft}
          {...MENU_APPLY_PROPS}
        />

        <p className="master-page-lead master-page-lead--compact">
          品名・価格・画像ファイル名を編集できます。レイアウト種別は客席画面の表示形式です（hero＝おすすめ大カード、drinks＝おすすめドリンク、list系＝一覧）。
        </p>

        <div className="master-sections">
          {sideDishSections.map((sec) => (
            <div key={sec.id} id={`${catIdPrefix}-${sec.id}`} className="master-sec master-sec--anchor">
              <div className="master-sec-top">
                <label className="master-field">
                  <span className="master-field-label">レイアウト</span>
                  <select
                    className="master-input"
                    value={sec.layout || 'list'}
                    onChange={(e) => updateSideDishSection(sec.id, { layout: e.target.value })}
                  >
                    <option value="hero">hero（おすすめ大）</option>
                    <option value="drinks">drinks（ドリンク3種）</option>
                    <option value="list-images">list-images（とりあえず系）</option>
                    <option value="list-images-foot">list-images-foot（人気・おつまみ）</option>
                    <option value="list">list（シンプル一覧）</option>
                  </select>
                </label>
                <label className="master-field">
                  <span className="master-field-label">見出し（日本語）</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleJa ?? ''}
                    onChange={(e) => updateSideDishSection(sec.id, { titleJa: e.target.value })}
                  />
                </label>
                <label className="master-field">
                  <span className="master-field-label">i18nキー</span>
                  <input
                    type="text"
                    className="master-input"
                    value={sec.titleKey ?? ''}
                    onChange={(e) => updateSideDishSection(sec.id, { titleKey: e.target.value })}
                  />
                </label>
                <button type="button" className="master-btn master-btn--ghost" onClick={() => removeSideDishSection(sec.id)}>
                  ブロック削除
                </button>
              </div>

              <div className="master-table-wrap">
                <table className="master-table">
                  <thead>
                    <tr>
                      <th className="master-th-id">ID</th>
                      <th>品名（厨房・伝票）</th>
                      <th className="master-th-price">価格</th>
                      <th>画像ファイル</th>
                      <th className="master-th-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((it) => (
                      <tr key={`${sec.id}-${it.id}`}>
                        <td>
                          <input
                            type="text"
                            className="master-input master-input--mono"
                            value={it.id}
                            onChange={(e) => updateSideDishItem(sec.id, it.id, { id: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input"
                            value={it.name}
                            onChange={(e) => updateSideDishItem(sec.id, it.id, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input master-input--price"
                            inputMode="numeric"
                            value={String(it.price ?? '')}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n) && Number.isFinite(n)) {
                                updateSideDishItem(sec.id, it.id, { price: n });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-input"
                            value={it.image ?? ''}
                            onChange={(e) => updateSideDishItem(sec.id, it.id, { image: e.target.value })}
                            placeholder="public 内のファイル名"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="master-btn master-btn--small"
                            onClick={() => removeSideDishItem(sec.id, it.id)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="master-btn master-btn--secondary" onClick={() => addSideDishItem(sec.id)}>
                ＋ 品目を追加
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
