import React, { useCallback, useMemo, useState } from 'react';
import {
  buildKitchenPageAbsoluteUrl,
  buildMasterPageAbsoluteUrl,
  buildSiteRootUrl,
} from './guestOrderUrl.js';

/**
 * 客席 / 厨房 / オーナーの3入口を並べて表示（URL・新規タブで開く・コピー）。
 * variant: master=常時展開、kitchen=折りたたみ
 */
export default function StoreEntryUrlsPanel({ variant = 'master' }) {
  const [copyKey, setCopyKey] = useState(null);

  const rows = useMemo(
    () => [
      {
        id: 'guest',
        title: 'お客様（客席オーダー）',
        note: '卓ごとのURLは「卓・売上サマリー」内の「客席オーダー用URL」でコピー（?table=卓番）',
        url: buildSiteRootUrl(),
      },
      {
        id: 'kitchen',
        title: 'スタッフ・厨房',
        note: '未提供・各卓・会計・カフェ／テイクアウト',
        url: buildKitchenPageAbsoluteUrl(),
      },
      {
        id: 'master',
        title: 'オーナー専用',
        note: 'メニュー編集・売上・日計',
        url: buildMasterPageAbsoluteUrl(),
      },
    ],
    [],
  );

  const copyUrl = useCallback(async (id, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyKey(id);
      window.setTimeout(() => setCopyKey((k) => (k === id ? null : k)), 1600);
    } catch {
      window.prompt('コピーできませんでした。手動でコピーしてください', url);
    }
  }, []);

  const inner = (
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

  if (variant === 'kitchen') {
    return (
      <details className="store-entry-urls store-entry-urls--kitchen">
        <summary className="store-entry-urls__summary">客席・オーナー・URL一覧（タップで開く）</summary>
        {inner}
      </details>
    );
  }

  return (
    <section className="store-entry-urls store-entry-urls--master" aria-label="店舗の3つの画面">
      <h2 className="store-entry-urls__heading">3つの画面（どれを開くか）</h2>
      {inner}
    </section>
  );
}
