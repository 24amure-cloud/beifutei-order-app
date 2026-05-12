import React from 'react';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';

export const NOMIHODAI_EXTRA_SHOTS = [
  {
    id: 'nm-shot-tequila',
    label: 'テキーラ',
    labelEn: 'Tequila',
    name: 'テキーラ（別料金ショット）',
    price: 600,
  },
  {
    id: 'nm-shot-jaeger',
    label: 'イエガーマイスター',
    labelEn: 'Jägermeister',
    name: 'イエガーマイスター（別料金ショット）',
    price: 700,
  },
  {
    id: 'nm-shot-cocabomb',
    label: 'コカボム',
    labelEn: 'Coca bomb',
    name: 'コカボム（別料金ショット）',
    price: 800,
  },
  {
    id: 'nm-shot-chamisul',
    label: 'チャミスル',
    labelEn: 'Chamisul',
    name: 'チャミスル（別料金ショット）',
    price: 1300,
  },
  {
    id: 'nm-shot-kleiner',
    label: 'クライナー',
    labelEn: 'Kleiner Feigling',
    name: 'クライナー（別料金ショット）',
    price: 800,
  },
  {
    id: 'nm-shot-staff-drink',
    label: 'スタッフドリンク',
    labelEn: 'Staff drink',
    name: 'スタッフドリンク（別料金）',
    price: 700,
  },
];

/** 見た目のバリエーション（旧デザインのソフト／サワー帯を維持） */
function categoryBlockClass(cat) {
  const en = (cat.titleEn || '').toUpperCase();
  const ja = cat.titleJa || '';
  if (en.includes('SOFT') || ja.includes('ソフト')) return 'nomihoudai-block nomihoudai-block--soft';
  if (en.includes('SOUR') || ja.includes('サワー')) return 'nomihoudai-block nomihoudai-block--sour';
  return 'nomihoudai-block';
}

function listClassFor(cat, blockClass) {
  const n = cat.items?.length ?? 0;
  if (n >= 10 || blockClass.includes('--soft') || blockClass.includes('--sour')) {
    return 'nomihoudai-block__list nomihoudai-block__list--cols';
  }
  return 'nomihoudai-block__list';
}

export default function NomihoudaiPage({ addToCart }) {
  const { nomihodaiActive } = useNomihodaiSession();
  const { nomihodaiCatalog } = useNomihodaiCatalog();

  return (
    <main className="main-content nomihoudai-page">
      <div className="nomihoudai-shell">
        {nomihodaiActive ? (
          <p className="nomihoudai-live-note" role="status">
            飲み放題プラン適用中です。ご注文は「飲み放題」タブからお選びください。
          </p>
        ) : null}
        <header className="nomihoudai-hero">
          <p className="nomihoudai-hero__label">ALL YOU CAN DRINK</p>
          <h1 className="nomihoudai-hero__title">飲み放題</h1>
          <p className="nomihoudai-hero__note">
            左の一覧はマスターで編集した飲み放題メニューと同期しています（同一オリジン・ポート）。
            スタッフまでお声がけください。
          </p>
        </header>

        <div className="nomihoudai-layout">
          <div className="nomihoudai-drinks">
            {nomihodaiCatalog.length === 0 ? (
              <p className="nomihoudai-master-empty" role="status">
                マスター（飲み放題メニュー）でカテゴリを追加すると、ここに表示されます。
              </p>
            ) : (
              nomihodaiCatalog.map((cat) => {
                const bc = categoryBlockClass(cat);
                const lc = listClassFor(cat, bc);
                return (
                  <section key={cat.id} className={bc}>
                    <div className="nomihoudai-block__head">
                      <span className="nomihoudai-block__en">{cat.titleEn}</span>
                      <span className="nomihoudai-block__ja">{cat.titleJa}</span>
                    </div>
                    <ul className={lc}>
                      {(cat.items || []).map((it) => (
                        <li key={it.id}>{it.name}</li>
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
          </div>

          <aside className="nomihoudai-system" aria-label="飲み放題システム・料金">
            <div className="nomihoudai-system__badge">SYSTEM</div>
            <h2 className="nomihoudai-system__plan-title">飲み放題プラン 90分</h2>
            <p className="nomihoudai-system__plan-note">
              ラストオーダーのお声かけはいたしません。左記ドリンクが対象です。
            </p>

            <div className="nomihoudai-price-row">
              <span className="nomihoudai-price-row__icon" aria-hidden="true">
                🚹
              </span>
              <span className="nomihoudai-price-row__label">男性</span>
              <span className="nomihoudai-price-row__yen">￥3,500</span>
            </div>
            <div className="nomihoudai-price-row nomihoudai-price-row--pink">
              <span className="nomihoudai-price-row__icon" aria-hidden="true">
                🚺
              </span>
              <span className="nomihoudai-price-row__label">女性</span>
              <span className="nomihoudai-price-row__yen">￥3,000</span>
            </div>

            <div className="nomihoudai-extend">
              <p className="nomihoudai-extend__title">自動延長制</p>
              <p className="nomihoudai-extend__body">
                そのまま続けていただける場合、自動で延長されます。
                <strong>＋60分 ￥1,800</strong>
              </p>
              <p className="nomihoudai-extend__sub">延長のご連絡は不要です。</p>
            </div>

            <div className="nomihoudai-shots">
              <h3 className="nomihoudai-shots__title">別料金ショット</h3>
              <ul className="nomihoudai-shots__list">
                {NOMIHODAI_EXTRA_SHOTS.map((s) => (
                  <li key={s.id} className="nomihoudai-shots__item">
                    <span className="nomihoudai-shots__name">{s.label}</span>
                    <span className="nomihoudai-shots__price">￥{s.price.toLocaleString()}</span>
                    <button
                      type="button"
                      className="nomihoudai-shots__add"
                      onClick={() => addToCart({ id: s.id, name: s.name, price: s.price })}
                    >
                      追加
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <p className="nomihoudai-taxi">🚕 タクシー・運転代行のご手配はお早めに。</p>
          </aside>
        </div>

        <p className="nomihoudai-footer-note">※ 表示価格は税込です。内容は店舗により異なる場合があります。</p>
      </div>
    </main>
  );
}
