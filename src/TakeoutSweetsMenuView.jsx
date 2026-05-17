import React from 'react';
import { useTakeoutSweetsDisplay } from './useTakeoutSweetsDisplay.js';
import { guestTakeoutItemDisplayName } from './guestMenuDisplay.js';

/** 客席・厨房共通のテイクアウトスイーツ一覧 */
export default function TakeoutSweetsMenuView({
  addToCart,
  variant = 'guest',
  ut,
  locale = 'ja',
  PageHeader,
}) {
  const { sectionsForDisplay } = useTakeoutSweetsDisplay();
  const isGuest = variant === 'guest';
  const t = ut ?? ((k) => k);

  const renderCard = (item, isRanked = false) => {
    const soldOut = (item.stock ?? 0) <= 0;
    const displayName = isGuest ? guestTakeoutItemDisplayName(item, locale) : item.name;
    const loc = locale === 'en' ? 'en-US' : 'ja-JP';
    const yen = locale === 'en' ? '¥' : '￥';
    return (
      <div className={`ts-card${soldOut ? ' ts-card--soldout' : ''}`} key={item.id}>
        {soldOut && <div className="ts-soldout-badge">{isGuest ? t('ts_soldout') : '品切れ'}</div>}
        {isRanked && item.rank != null && !soldOut && (
          <div className={item.rank === 1 ? 'ts-rank-stack ts-rank-stack--no1' : 'ts-rank-stack'}>
            {item.rank === 1 ? <span className="ts-rank-zabuton" aria-hidden="true" /> : null}
            <div className="ts-rank-badge" style={{ color: item.color }}>
              {isGuest ? (
                <>
                  {t('ts_popular_no')}
                  <br />
                  {t('ts_rank_suffix')}
                  {item.rank}
                </>
              ) : (
                <>
                  人気
                  <br />
                  No.{item.rank}
                </>
              )}
            </div>
          </div>
        )}
        <div
          className="ts-img"
          style={
            item.image
              ? { backgroundImage: `url("${item.image}")` }
              : {
                  backgroundImage: `url("https://via.placeholder.com/150x150/transparent/333?text=${encodeURIComponent(item.id)}")`,
                }
          }
        />
        <div className="ts-name">
          {displayName.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <div className="ts-card-footer">
          <div className="ts-price">
            {yen}
            {Number(item.price).toLocaleString(loc)}
          </div>
          <button
            type="button"
            className="ts-add-btn"
            disabled={soldOut}
            title={soldOut ? (isGuest ? t('ts_soldout_title') : '品切れのため注文できません') : undefined}
            onClick={() => addToCart({ id: item.id, name: item.name.replace(/\n/g, ''), price: item.price })}
          >
            {isGuest ? t('takeout_cart_add') : '＋ カートに追加'}
          </button>
        </div>
      </div>
    );
  };

  const sectionTitle = (sec) => {
    if (isGuest && sec.titleKey) return t(sec.titleKey);
    return sec.titleJa || sec.titleKey || '';
  };

  const headerNote = isGuest
    ? t('ts_header_note')
    : '※油そば・フードメニュー・お酒のご利用の方は食中後のデザートとしてご利用いただけます';
  const headerAlt = isGuest ? t('header_takeout') : 'takeout北海道スイーツ';

  return (
    <main
      className="main-content"
      style={{ background: 'linear-gradient(135deg, #FFE4E1 0%, #FFF0F5 50%, #F0F8FF 100%)' }}
    >
      <div className="ts-wrapper">
        {PageHeader ? <PageHeader pageKey="takeout" alt={headerAlt} /> : null}
        <p className="ts-header-note">{headerNote}</p>

        {sectionsForDisplay.map((sec) => (
          <div className="ts-section" key={sec.id}>
            <div
              className="ts-section-title"
              style={sec.titleStyle ? { background: sec.titleStyle } : undefined}
            >
              <span>♡</span> {sectionTitle(sec)} <span>♡</span>
            </div>
            <div className="ts-grid">{sec.items.map((item) => renderCard(item, sec.isRanked))}</div>
          </div>
        ))}

        {isGuest ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button type="button" className="ts-view-all">
              {t('ts_view_all')}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
