import React, { useCallback, useMemo, useState } from 'react';
import {
  buildKitchenPageAbsoluteUrl,
  buildMasterPageAbsoluteUrl,
  buildSiteRootUrl,
} from './guestOrderUrl.js';

const ENTRY_ROWS = [
  {
    id: 'guest',
    title: 'お客様用（卓オーダー）',
    titleShort: 'お客様用',
    note: '卓ごとのQRは下の「スタッフ用」から',
    buildUrl: buildSiteRootUrl,
  },
  {
    id: 'kitchen',
    title: '厨房・スタッフ用',
    titleShort: '厨房',
    note: '注文確認・会計',
    buildUrl: buildKitchenPageAbsoluteUrl,
  },
  {
    id: 'master',
    title: '管理画面（この画面）',
    titleShort: '管理画面',
    note: '売上・メニュー',
    buildUrl: buildMasterPageAbsoluteUrl,
  },
];

export default function StoreEntryUrlsPanel({ variant = 'master' }) {
  const [copyKey, setCopyKey] = useState(null);
  const [selectedId, setSelectedId] = useState('guest');
  const isPresident = variant === 'master-president';

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

  const presidentBody = (
    <div className="store-entry-urls__picker store-entry-urls__picker--president">
      <label className="store-entry-urls__select-label">
        <span className="store-entry-urls__select-caption">別の画面を開く</span>
        <select
          className="store-entry-urls__select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.titleShort || row.title}
            </option>
          ))}
        </select>
      </label>
      <div className="store-entry-urls__actions store-entry-urls__actions--row">
        <a
          className="store-entry-urls__open store-entry-urls__open--large"
          href={selected.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          開く
        </a>
        <button
          type="button"
          className="store-entry-urls__copy store-entry-urls__copy--large"
          onClick={() => copyUrl(selected.id, selected.url)}
        >
          {copyKey === selected.id ? 'コピーしました' : 'リンクをコピー'}
        </button>
      </div>
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
      {!isPresident && <p className="store-entry-urls__note">{selected.note}</p>}
      {!isPresident && <code className="store-entry-urls__href">{selected.url}</code>}
      <div className="store-entry-urls__actions store-entry-urls__actions--row">
        <a
          className={`store-entry-urls__open${isPresident ? ' store-entry-urls__open--large' : ''}`}
          href={selected.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          開く
        </a>
        <button
          type="button"
          className={`store-entry-urls__copy${isPresident ? ' store-entry-urls__copy--large' : ''}`}
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
    <section
      className={`store-entry-urls store-entry-urls--master${isPresident ? ' store-entry-urls--president' : ''}`}
      aria-label="画面を開く"
    >
      <h2 className="store-entry-urls__heading">{isPresident ? 'ほかの画面' : '画面を開く'}</h2>
      {isPresident ? presidentBody : dropdownBody}
    </section>
  );
}
