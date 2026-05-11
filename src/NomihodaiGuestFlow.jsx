import React from 'react';
import { NOMIHODAI_EXTENSION_PRICE_YEN } from './nomihodaiConstants.js';
import DrinkHeroImage from './DrinkHeroImage.jsx';
import { getNomihodaiHeroCandidatesForCategory } from './data/drinkHeroImages.js';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';
import { getGuestIntentForTable, getNomihodaiForTable } from './nomihodaiSession.js';
import NomihodaiGuestDrinkMenu from './NomihodaiGuestDrinkMenu.jsx';
function fmtRequested(ms) {
  try {
    return new Date(ms).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** 検討ページ（開始後 FF と同系のダーク×ゴールド） */
export function NomihodaiConsiderPage() {
  const { requestNomihodaiGuestIntent, prices } = useNomihodaiSession();
  const { nomihodaiCatalog } = useNomihodaiCatalog();

  return (
    <main className="main-content nh-prospect nh-prospect--ff nh-active nh-active--ff">
      <div className="nh-active__shell">
        <header className="nh-prospect__header">
          <div className="nh-prospect-hero nh-prospect-hero--compact">
            <p className="nh-prospect-hero__eyebrow">FREE FLOW</p>
            <h1 className="nh-prospect-hero__title">飲み放題メニュー</h1>
            <p className="nh-prospect-hero__subtitle">90分プラン · カテゴリ別に一覧 · 希望はボタンからスタッフへ</p>
          </div>
          <div className="nh-ff-prebar" aria-label="飲み放題プラン概要">
            <div className="nh-ff-prebar__segment">
              <span className="nh-ff-prebar__en">FREE FLOW</span>
              <span className="nh-ff-prebar__ja">飲み放題</span>
            </div>
            <div className="nh-ff-prebar__rule" aria-hidden="true" />
            <div className="nh-ff-prebar__segment nh-ff-prebar__segment--hero">
              <span className="nh-ff-prebar__en">PLAN TIME</span>
              <p className="nh-ff-prebar__hero">
                <strong>90</strong>
                <span className="nh-ff-prebar__min">MIN</span>
              </p>
              <span className="nh-ff-prebar__ja">プラン時間</span>
            </div>
            <div className="nh-ff-prebar__rule" aria-hidden="true" />
            <div className="nh-ff-prebar__segment">
              <span className="nh-ff-prebar__en">LINEUP</span>
              <span className="nh-ff-prebar__ja">下記から内容をご確認</span>
            </div>
          </div>
        </header>

        <section className="nh-prospect__cta-block nh-prospect__cta-block--early" aria-labelledby="nh-cta-h">
          <div className="nh-prospect__cta-inner">
            <h2 id="nh-cta-h" className="nh-prospect__cta-pretitle">
              飲み放題をご希望ですか？
            </h2>
            <p className="nh-prospect__cta-desc">
              タップで卓番つきの希望をスタッフへお届けします（開始は確認後に行います）。
            </p>
            <button
              type="button"
              className="nh-prospect__cta-btn"
              onClick={() => requestNomihodaiGuestIntent()}
            >
              <span className="nh-prospect__cta-btn-ico" aria-hidden="true">
                🍺
              </span>
              <span className="nh-prospect__cta-btn-label">飲み放題を希望する</span>
              <span className="nh-prospect__cta-btn-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </section>

        <p className="nh-prospect__tagline nh-prospect__tagline--after-cta" role="presentation">
          カテゴリ・料金の詳細は下へ（縦スクロール）
        </p>

        <div className="nh-prospect__main-grid nh-prospect__main-grid--stack">
          <div className="nh-prospect__menu-area">
            {nomihodaiCatalog.length === 0 ? (
              <p className="nh-prospect__menu-empty">マスターで飲み放題カテゴリを設定すると、ここに表示されます。</p>
            ) : (
              <div className="nh-prospect__menu-grid nh-prospect__menu-grid--compact">
                {nomihodaiCatalog.map((cat, idx) => (
                  <article
                    key={cat.id}
                    className="nh-prospect__menu-card"
                    style={{ '--nh-card-i': idx }}
                  >
                    <div className="nh-prospect__menu-card-head">
                      <span className="nh-prospect__menu-ja">{cat.titleJa}</span>
                      <span className="nh-prospect__menu-en">{cat.titleEn}</span>
                    </div>
                    <div className="nh-prospect__menu-card-body">
                      <DrinkHeroImage
                        candidates={getNomihodaiHeroCandidatesForCategory(cat)}
                        className="nh-prospect__menu-card-hero"
                        imgClassName="nh-prospect__menu-card-hero-img"
                      />
                      <ul className="nh-prospect__menu-items">
                        {(cat.items || []).map((it) => (
                          <li key={it.id}>{it.name}</li>
                        ))}
                      </ul>
                      <div
                        className={`nh-prospect__menu-accent nh-prospect__menu-accent--${idx % 6}`}
                        aria-hidden="true"
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="nh-prospect__plan" aria-label="プラン概要">
            <div className="nh-prospect__plan-inner">
              <div className="nh-prospect__plan-head">
                <span className="nh-prospect__plan-clock" aria-hidden="true">
                  🕐
                </span>
                <span className="nh-prospect__plan-90">90分</span>
              </div>
              <p className="nh-prospect__plan-lo">※ラストオーダーコールは致しません。</p>

              <div className="nh-prospect__plan-prices">
                <div className="nh-prospect__plan-row nh-prospect__plan-row--men">
                  <span className="nh-prospect__plan-gender" aria-hidden="true">
                    🚹
                  </span>
                  <span>男性（税込）</span>
                  <strong>￥{prices.men.toLocaleString()}</strong>
                </div>
                <div className="nh-prospect__plan-row nh-prospect__plan-row--women">
                  <span className="nh-prospect__plan-gender" aria-hidden="true">
                    🚺
                  </span>
                  <span>女性（税込）</span>
                  <strong>￥{prices.women.toLocaleString()}</strong>
                </div>
              </div>

              <p className="nh-prospect__plan-extend">
                延長 <strong>＋20分 ￥{NOMIHODAI_EXTENSION_PRICE_YEN.toLocaleString()}</strong>（税込 · 男女共通）
              </p>

              <table className="nh-prospect__seat-table">
                <caption className="nh-prospect__seat-cap">お席料（チャーム）</caption>
                <tbody>
                  <tr>
                    <th scope="row">17:00〜21:00</th>
                    <td>￥500</td>
                  </tr>
                  <tr>
                    <th scope="row">21:00以降</th>
                    <td>￥800</td>
                  </tr>
                </tbody>
              </table>

              <p className="nh-prospect__plan-taxi">🚕 タクシー・運転代行のご手配はお早めに。</p>
            </div>
          </aside>
        </div>

        <footer className="nh-prospect__bottom">
          <section className="nh-prospect__terms" aria-labelledby="nh-terms-h">
            <h2 id="nh-terms-h" className="nh-prospect__terms-title">
              ご利用条件
            </h2>
            <ul className="nh-prospect__terms-list">
              <li>ご注文はグループ単位でお願いいたします。</li>
              <li>初回90分後の延長は20分単位（￥{NOMIHODAI_EXTENSION_PRICE_YEN.toLocaleString()}／男女共通）です。</li>
              <li>他割引との併用はできません。</li>
              <li>ドリンクはお一人様1杯ずつ。過度な残杯には別途料金が発生する場合があります。</li>
            </ul>
          </section>
        </footer>
      </div>
    </main>
  );
}

/** ステップ2：厨房開始待ち（FF 同系） */
export function NomihodaiIntentWaitingPage() {
  const { session, clearNomihodaiGuestIntent } = useNomihodaiSession();
  const at = getGuestIntentForTable(session, session.tableLabel)?.requestedAt;

  return (
    <main className="main-content nh-wait nh-wait--ff nh-active nh-active--ff">
      <div className="nh-active__shell nh-wait__outer">
        <div className="nh-wait__shell">
          <p className="nh-wait__eyebrow">WAITING</p>
          <p className="nh-wait__subeyebrow">スタッフ確認中</p>
          <div className="nh-wait__icon" aria-hidden="true">
            🍺
          </div>
          <h1 className="nh-wait__title">プラン開始までしばらくお待ちください</h1>
          <p className="nh-wait__text">
            {session.tableLabel}番卓から、飲み放題のご利用希望をお届けしています。
            {at != null && (
              <>
                <br />
                <span className="nh-wait__time">送信：{fmtRequested(at)}</span>
              </>
            )}
          </p>
          <p className="nh-wait__hint">
            開始後は画面上部にセッション表示が現れ、このタブからフリーフローをご注文いただけます。
          </p>
          <button
            type="button"
            className="nh-wait__cancel"
            onClick={() => clearNomihodaiGuestIntent(session.tableLabel)}
          >
            希望を取り消す
          </button>
        </div>
      </div>
    </main>
  );
}

/** 飲み放題タブ：検討 → 待機 → 開始後はメニュー＋右カラム状況 */
export function NomihodaiTabRouter({ addToCart, onOpenNomihodaiBill }) {
  const { nomihodaiActive, session } = useNomihodaiSession();
  const nh = getNomihodaiForTable(session, session.tableLabel);
  /** 会計後フローは App 全体オーバーレイで表示。ここでは重複描画しない */
  if (session.nomihodaiFarewell) return null;
  if (session.checkoutRequestAt) return null;
  if (nomihodaiActive && nh?.guestCheckoutRequestedAt) return null;

  const guestIntent = getGuestIntentForTable(session, session.tableLabel);

  if (nomihodaiActive) {
    return <NomihodaiGuestDrinkMenu onOpenBill={onOpenNomihodaiBill} addToCart={addToCart} />;
  }
  if (guestIntent) {
    return <NomihodaiIntentWaitingPage />;
  }
  return <NomihodaiConsiderPage />;
}
