import React, { useCallback, useMemo, useState } from 'react';
import {
  buildKitchenPageAbsoluteUrl,
  buildMasterPageAbsoluteUrl,
  buildSiteRootUrl,
} from './guestOrderUrl.js';

const ENTRY_ROWS = [
  {
    id: 'guest',
    title: 'お客様（客席オーダー）',
    note: '卓ごとのURLは「卓・売上サマリー」内の「客席オーダー用URL」でコピー（?table=卓番）',
    buildUrl: buildSiteRootUrl,
  },
  {
    id: 'kitchen',
    title: 'スタッフ・厨房',
    note: '未提供・各卓・会計・カフェ／テイクアウト',
    buildUrl: buildKitchenPageAbsoluteUrl,
  },
  {
    id: 'master',
    title: 'オーナー専用',
    note: 'メニュー編集・売上・日計',
    buildUrl: buildMasterPageAbsoluteUrl,
  },
];

/**
 * 客席 / 厨房 / オーナーの3入口（URL・新規タブで開く・コピー）。
 * variant: master=プルダウン選択、kitchen=折りたたみ一覧
 */
export default function StoreEntryUrlsPanel({ variant = 'master' }) {
  const [copyKey, setCopyKey] = useState(null);
  const [selectedId, setSelectedId] = useState('guest');

  const rows = useMemo(
    () =>
      ENTRY_ROWS.map((row) => ({
        ...row,
        url: row.buildUrl(),
      })),
    [],
  );

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  const copyUrl = useCallback(async (id, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyKey(id);
      window.setTimeout(() => setCopyKey((k) => (k === id ? null : k)), 1600);
    } catch {
      window.prompt('コピーできませんでした。手動でコピーしてください', url);
    }
  }, []);

  const listBody = (
    <div className="store-entry-urls__body">
      {rows.map((row) => (
        <div key={row.id} className="store-entry-urls__row">
          <div className="store-entry-urls__meta">
            <strong className="store-entry-urls__title">{row.title}</strong>
            <p className="store-entry-urls__note">{row.note}</p>
            <code className="store-entry-urls__href">{row.url}</code>
          </div>
          <div className="store-entry-urls__actions">
            <a className="store-entry-urls__open" href={row.url} target="_blank" rel="noopener noreferrer">
              開く
            </a>
            <button type="button" className="store-entry-urls__copy" onClick={() => copyUrl(row.id, row.url)}>
              {copyKey === row.id ? 'コピー済' : 'URLをコピー'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const dropdownBody = (
    <div className="store-entry-urls__picker">
      <label className="store-entry-urls__select-label">
        <span className="store-entry-urls__select-caption">開く画面</span>
        <select
          className="store-entry-urls__select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </select>
      </label>
      <p className="store-entry-urls__note">{selected.note}</p>
      <code className="store-entry-urls__href">{selected.url}</code>
      <div className="store-entry-urls__actions store-entry-urls__actions--row">
        <a
          className="store-entry-urls__open"
          href={selected.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          開く
        </a>
        <button
          type="button"
          className="store-entry-urls__copy"
          onClick={() => copyUrl(selected.id, selected.url)}
        >
          {copyKey === selected.id ? 'コピー済' : 'URLをコピー'}
        </button>
      </div>
    </div>
  );

  if (variant === 'kitchen') {
    return (
      <details className="store-entry-urls store-entry-urls--kitchen">
        <summary className="store-entry-urls__summary">客席・オーナー・URL一覧（タップで開く）</summary>
        {listBody}
      </details>
    );
  }

  return (
    <section className="store-entry-urls store-entry-urls--master" aria-label="店舗の3つの画面">
      <h2 className="store-entry-urls__heading">3つの画面</h2>
      {dropdownBody}
    </section>
  );
}
