import React from 'react';

function MasterApplyBar({ dirty, applyNotice, onApply, onDiscard }) {
  return (
    <div className="master-apply-bar" role="status" aria-live="polite">
      <p className="master-apply-bar__hint">
        {dirty
          ? '編集内容はまだ客席タブレットに出ていません。「客席に反映」を押してください。'
          : '客席タブレットと同じ内容です。'}
      </p>
      <div className="master-apply-bar__actions">
        <button type="button" className="master-btn master-btn--apply" disabled={!dirty} onClick={onApply}>
          客席に反映
        </button>
        <button type="button" className="master-btn master-btn--ghost" disabled={!dirty} onClick={onDiscard}>
          変更を破棄
        </button>
        {applyNotice === 'ok' ? <span className="master-apply-bar__ok">反映しました</span> : null}
      </div>
    </div>
  );
}

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
