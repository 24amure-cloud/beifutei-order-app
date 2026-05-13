import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

function parsePromoUrls(raw) {
  if (raw == null || raw === '') return [];
  return String(raw)
    .split(/[\n,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 客席（index）用: 無操作が続いたら全画面で宣伝画像／動画を表示。
 *
 * 注文優先: App 側で「カートに注文対象が入っている間」は paused にし、宣伝を出しません。
 * 軽さ: 動画は表示直前まで DOM に載せない。長尺・高解像度は CDN 直リンクや圧縮（720p・短尺）推奨。
 *
 * .env 例:
 *   VITE_GUEST_IDLE_SCREENSAVER_MS=120000
 *   VITE_GUEST_PROMO_MEDIA=/screensaver3.mp4
 *   VITE_GUEST_PROMO_POSTER=/promo/video-thumb.jpg
 *   VITE_GUEST_PROMO_SLIDE_MS=8000
 *
 * 動画は自動再生のため muted 固定。複数 URL は指定間隔でローテーション。
 */
export function readGuestPromoScreensaverEnv() {
  const urls = parsePromoUrls(import.meta.env.VITE_GUEST_PROMO_MEDIA);
  const idleMs = Math.max(0, Math.floor(Number(import.meta.env.VITE_GUEST_IDLE_SCREENSAVER_MS) || 0));
  const slideMs = Math.max(3000, Math.floor(Number(import.meta.env.VITE_GUEST_PROMO_SLIDE_MS) || 8000));
  const posterUrl = String(import.meta.env.VITE_GUEST_PROMO_POSTER ?? '').trim() || null;
  return { urls, idleMs, slideMs, posterUrl, enabled: urls.length > 0 && idleMs > 0 };
}

export default function GuestPromoScreensaver({ paused }) {
  const { urls, idleMs, slideMs, posterUrl, enabled } = useMemo(() => readGuestPromoScreensaverEnv(), []);
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const idleTimerRef = useRef(null);
  const slideTimerRef = useRef(null);
  const videoRef = useRef(null);

  const setVideoEl = useCallback((el) => {
    videoRef.current = el;
    if (el) {
      try {
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', 'true');
      } catch {
        /* ignore */
      }
    }
  }, []);

  const bumpActivity = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    setVisible(false);
    if (!enabled || paused) return;
    idleTimerRef.current = window.setTimeout(() => {
      setVisible(true);
      setSlide(0);
    }, idleMs);
  }, [enabled, idleMs, paused]);

  useEffect(() => {
    if (paused) {
      setVisible(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    }
  }, [paused]);

  useEffect(() => {
    if (!enabled) return undefined;
    const opts = { capture: true, passive: true };
    const onAct = () => bumpActivity();
    window.addEventListener('pointerdown', onAct, opts);
    window.addEventListener('keydown', onAct, opts);
    window.addEventListener('touchstart', onAct, opts);
    window.addEventListener('wheel', onAct, opts);
    document.addEventListener('visibilitychange', onAct);
    if (!paused) bumpActivity();
    return () => {
      window.removeEventListener('pointerdown', onAct, opts);
      window.removeEventListener('keydown', onAct, opts);
      window.removeEventListener('touchstart', onAct, opts);
      window.removeEventListener('wheel', onAct, opts);
      document.removeEventListener('visibilitychange', onAct);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [enabled, bumpActivity]);

  useEffect(() => {
    if (!enabled || !visible || urls.length <= 1) return undefined;
    if (slideTimerRef.current) window.clearInterval(slideTimerRef.current);
    slideTimerRef.current = window.setInterval(() => {
      setSlide((s) => (s + 1) % urls.length);
    }, slideMs);
    return () => {
      if (slideTimerRef.current) window.clearInterval(slideTimerRef.current);
    };
  }, [enabled, visible, urls, slideMs]);

  useEffect(() => {
    if (!visible || !videoRef.current) return;
    const v = videoRef.current;
    const u = urls[slide];
    if (!u || !VIDEO_RE.test(u)) return;
    v.defaultMuted = true;
    v.muted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();
    const onVis = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [visible, slide, urls]);

  if (!enabled) return null;

  const currentUrl = urls[slide] || urls[0];
  const isVideo = currentUrl && VIDEO_RE.test(currentUrl);

  const onOverlayTap = () => {
    bumpActivity();
  };

  return (
    <div
      className={`guest-promo-screensaver${visible ? ' guest-promo-screensaver--visible' : ''}`}
      role="presentation"
      aria-hidden={!visible}
      onPointerDown={visible ? onOverlayTap : undefined}
    >
      {visible ? (
        <>
          <div className="guest-promo-screensaver__media" aria-hidden="true">
            {isVideo ? (
              <video
                key={currentUrl}
                ref={setVideoEl}
                className="guest-promo-screensaver__video"
                src={currentUrl}
                poster={posterUrl || undefined}
                preload="metadata"
                muted
                defaultMuted
                playsInline
                autoPlay
                loop
                controls={false}
                disablePictureInPicture
              />
            ) : (
              <img className="guest-promo-screensaver__img" src={currentUrl} alt="" decoding="async" loading="eager" />
            )}
          </div>
          <p className="guest-promo-screensaver__hint">画面をタッチして注文に戻る</p>
        </>
      ) : null}
    </div>
  );
}
