import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

function parsePromoUrls(raw) {
  if (raw == null || raw === '') return [];
  return String(raw)
    .split(/[\n,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** public 配下や相対パスを Vite の base（サブパス配信）でも正しく解決 */
function resolveGuestPromoMediaUrl(path) {
  const p = String(path).trim();
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  const base = String(import.meta.env.BASE_URL ?? '/');
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const rel = p.startsWith('/') ? p.slice(1) : p;
  return `${normalizedBase}${rel}`;
}

/**
 * 客席（index）用: 無操作が続いたら全画面で宣伝画像／動画を表示。
 *
 * 注文優先: App 側で「カートに注文対象が入っている間」は paused にし、宣伝を出しません。
 *
 * .env 例:
 *   VITE_GUEST_IDLE_SCREENSAVER_MS=120000
 *   VITE_GUEST_PROMO_MEDIA=/screensaver3.mp4
 *   VITE_GUEST_PROMO_POSTER=/promo/video-thumb.jpg
 *   VITE_GUEST_PROMO_SLIDE_MS=8000
 *
 * 動画は自動再生のため muted 固定。複数 URL は指定間隔でローテーション。
 * 未設定時の既定: public/screensaver3.mp4・無操作 120 秒（無効化は VITE_GUEST_IDLE_SCREENSAVER_MS=0）。
 */
export function readGuestPromoScreensaverEnv() {
  const envMedia = import.meta.env.VITE_GUEST_PROMO_MEDIA;
  const fromEnv = parsePromoUrls(envMedia);
  const urls =
    fromEnv.length > 0 ? fromEnv.map(resolveGuestPromoMediaUrl) : [resolveGuestPromoMediaUrl('screensaver3.mp4')];

  const envIdleRaw = import.meta.env.VITE_GUEST_IDLE_SCREENSAVER_MS;
  const idleMs =
    envIdleRaw === undefined || envIdleRaw === ''
      ? 120_000
      : Math.max(0, Math.floor(Number(envIdleRaw) || 0));

  const slideMs = Math.max(3000, Math.floor(Number(import.meta.env.VITE_GUEST_PROMO_SLIDE_MS) || 8000));
  const posterRaw = String(import.meta.env.VITE_GUEST_PROMO_POSTER ?? '').trim();
  const posterUrl = posterRaw ? resolveGuestPromoMediaUrl(posterRaw) : null;
  return { urls, idleMs, slideMs, posterUrl, enabled: urls.length > 0 && idleMs > 0 };
}

export default function GuestPromoScreensaver({ paused }) {
  const { urls, idleMs, slideMs, posterUrl, enabled } = useMemo(() => readGuestPromoScreensaverEnv(), []);
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const idleTimerRef = useRef(null);
  const slideTimerRef = useRef(null);
  const videoRef = useRef(null);
  const preloadVideoRef = useRef(null);

  const primaryUrl = urls[0] || '';
  const primaryIsVideo = primaryUrl && VIDEO_RE.test(primaryUrl);

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
      setMediaError(false);
    }, idleMs);
  }, [enabled, idleMs, paused]);

  useEffect(() => {
    if (paused) {
      setVisible(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    } else if (enabled) {
      bumpActivity();
    }
  }, [paused, enabled, bumpActivity]);

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
  }, [enabled, paused, bumpActivity]);

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
    if (!enabled || !primaryIsVideo || !primaryUrl) return undefined;
    const v = preloadVideoRef.current;
    if (!v) return undefined;
    v.src = primaryUrl;
    v.load();
    return undefined;
  }, [enabled, primaryIsVideo, primaryUrl]);

  useEffect(() => {
    setMediaError(false);
  }, [slide, urls]);

  useEffect(() => {
    if (!visible || !videoRef.current) return;
    const v = videoRef.current;
    const u = urls[slide];
    if (!u || !VIDEO_RE.test(u)) return;
    v.defaultMuted = true;
    v.muted = true;
    if (v.getAttribute('src') !== u) v.src = u;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    v.load();
    tryPlay();
    const onVis = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    const onReady = () => tryPlay();
    v.addEventListener('loadeddata', onReady);
    v.addEventListener('canplay', onReady);
    v.addEventListener('canplaythrough', onReady);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      v.removeEventListener('loadeddata', onReady);
      v.removeEventListener('canplay', onReady);
      v.removeEventListener('canplaythrough', onReady);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [visible, slide, urls]);

  useEffect(() => {
    document.body.classList.toggle('guest-screensaver-active', visible);
    return () => document.body.classList.remove('guest-screensaver-active');
  }, [visible]);

  if (!enabled) return null;

  const currentUrl = urls[slide] || urls[0];
  const isVideo = currentUrl && VIDEO_RE.test(currentUrl);

  const onOverlayTap = () => {
    bumpActivity();
  };

  const overlay = (
    <div
      className={`guest-promo-screensaver${visible ? ' guest-promo-screensaver--visible' : ''}`}
      role="presentation"
      aria-hidden={!visible}
      onPointerDown={visible ? onOverlayTap : undefined}
    >
      {primaryIsVideo ? (
        <video
          ref={preloadVideoRef}
          className="guest-promo-screensaver__preload"
          src={primaryUrl}
          preload="auto"
          muted
          playsInline
          aria-hidden
          tabIndex={-1}
        />
      ) : null}
      {visible ? (
        <>
          <div className="guest-promo-screensaver__media" aria-hidden="true">
            {isVideo ? (
              mediaError ? (
                <p className="guest-promo-screensaver__media-error">
                  動画を読み込めませんでした。
                  <br />
                  <small>{currentUrl}</small>
                </p>
              ) : (
                <video
                  key={currentUrl}
                  ref={setVideoEl}
                  className="guest-promo-screensaver__video"
                  src={currentUrl}
                  poster={posterUrl || undefined}
                  preload="auto"
                  muted
                  defaultMuted
                  playsInline
                  autoPlay
                  loop
                  controls={false}
                  disablePictureInPicture
                  onError={() => setMediaError(true)}
                />
              )
            ) : (
              <img
                className="guest-promo-screensaver__img"
                src={currentUrl}
                alt=""
                decoding="async"
                loading="eager"
                onError={() => setMediaError(true)}
              />
            )}
          </div>
          <p className="guest-promo-screensaver__hint">画面をタッチして注文に戻る</p>
        </>
      ) : null}
    </div>
  );

  return createPortal(overlay, document.body);
}
