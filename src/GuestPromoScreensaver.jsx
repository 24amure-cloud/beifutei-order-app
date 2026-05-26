import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GUEST_PROMO_DEFAULT_VIDEO_PATH } from './guestPromoScreensaverConfig.js';

const VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

function parsePromoUrls(raw) {
  if (raw == null || raw === '') return [];
  return String(raw)
    .split(/[\n,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** public 配下や相対パスを Vite の base（サブパス配信）でも正しく解決 */
export function resolveGuestPromoMediaUrl(path) {
  const p = String(path).trim();
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  const base = String(import.meta.env.BASE_URL ?? '/');
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const rel = p.startsWith('/') ? p.slice(1) : p;
  return `${normalizedBase}${rel}`;
}

function defaultVideoUrl() {
  return resolveGuestPromoMediaUrl(GUEST_PROMO_DEFAULT_VIDEO_PATH);
}

function normalizeScreensaverUrls(urls) {
  const list = urls.map((u) => String(u).trim()).filter(Boolean);
  const videos = list.filter((u) => VIDEO_RE.test(u));
  if (videos.length > 0) return videos;
  const onlyVideo = list.filter((u) => !/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(u));
  if (onlyVideo.length > 0) return onlyVideo;
  return [defaultVideoUrl()];
}

/**
 * 客席（index）用: 無操作が続いたら全画面で宣伝動画を表示。
 * 既定: public/screensaver4.mp4（Vercel 配信用に約 26MB に圧縮済み）
 */
export function readGuestPromoScreensaverEnv() {
  const envMedia = import.meta.env.VITE_GUEST_PROMO_MEDIA;
  const fromEnv = parsePromoUrls(envMedia);
  const rawUrls =
    fromEnv.length > 0 ? fromEnv.map(resolveGuestPromoMediaUrl) : [defaultVideoUrl()];
  const urls = normalizeScreensaverUrls(rawUrls);

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
  const { urls: configuredUrls, idleMs, slideMs, posterUrl, enabled } = useMemo(
    () => readGuestPromoScreensaverEnv(),
    [],
  );
  const [playUrls] = useState(configuredUrls);
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const idleTimerRef = useRef(null);
  const slideTimerRef = useRef(null);
  const videoRef = useRef(null);
  const videoRetryRef = useRef(0);

  const primaryUrl = playUrls[0] || '';
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
      setVideoError(false);
      videoRetryRef.current = 0;
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
    if (!enabled || !visible || playUrls.length <= 1) return undefined;
    if (slideTimerRef.current) window.clearInterval(slideTimerRef.current);
    slideTimerRef.current = window.setInterval(() => {
      setSlide((s) => (s + 1) % playUrls.length);
    }, slideMs);
    return () => {
      if (slideTimerRef.current) window.clearInterval(slideTimerRef.current);
    };
  }, [enabled, visible, playUrls, slideMs]);

  useEffect(() => {
    if (!visible || !videoRef.current) return;
    const v = videoRef.current;
    const u = playUrls[slide];
    if (!u || !VIDEO_RE.test(u)) return;
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
    document.addEventListener('visibilitychange', onVis);
    return () => {
      v.removeEventListener('loadeddata', onReady);
      v.removeEventListener('canplay', onReady);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [visible, slide, playUrls]);

  useEffect(() => {
    document.body.classList.toggle('guest-screensaver-active', visible);
    return () => document.body.classList.remove('guest-screensaver-active');
  }, [visible]);

  const onVideoError = useCallback(() => {
    const v = videoRef.current;
    if (v && videoRetryRef.current < 2) {
      videoRetryRef.current += 1;
      const base = playUrls[slide] || playUrls[0];
      if (base) {
        const sep = base.includes('?') ? '&' : '?';
        v.src = `${base}${sep}retry=${Date.now()}`;
        v.load();
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        return;
      }
    }
    setVideoError(true);
  }, [playUrls, slide]);

  if (!enabled) return null;

  const currentUrl = playUrls[slide] || playUrls[0];
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
      {visible ? (
        <>
          <div className="guest-promo-screensaver__media" aria-hidden="true">
            {isVideo && !videoError ? (
              <video
                key={`${currentUrl}-${slide}`}
                ref={setVideoEl}
                className="guest-promo-screensaver__video"
                src={currentUrl}
                poster={posterUrl || undefined}
                preload="auto"
                muted
                playsInline
                autoPlay
                loop
                controls={false}
                disablePictureInPicture
                onError={onVideoError}
              />
            ) : (
              <p className="guest-promo-screensaver__video-fallback" role="status">
                動画を読み込めませんでした。しばらくしてから画面をタッチして注文に戻ってください。
              </p>
            )}
          </div>
          <p className="guest-promo-screensaver__hint">画面をタッチして注文に戻る</p>
        </>
      ) : null}
    </div>
  );

  return createPortal(overlay, document.body);
}
