/** Vite の BASE_URL を常に末尾スラッシュ付きのパスとして扱う */
export function appBasePath() {
  const base = String(import.meta.env.BASE_URL || '/');
  return base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`;
}

function siteBaseAbsUrl() {
  if (typeof window === 'undefined') return '';
  return new URL(appBasePath(), window.location.origin).href;
}

/** 客席オーダー（index）のトップ。卓は ?table= で付ける */
export function buildSiteRootUrl() {
  return siteBaseAbsUrl();
}

export function buildKitchenPageAbsoluteUrl() {
  if (typeof window === 'undefined') return '';
  return new URL('kitchen.html', siteBaseAbsUrl()).href;
}

export function buildMasterPageAbsoluteUrl() {
  if (typeof window === 'undefined') return '';
  return new URL('master.html', siteBaseAbsUrl()).href;
}

/**
 * 客席オーダー画面（index）の卓付きURL。App.jsx の URLSearchParams('table') と一致させる。
 */
export function buildGuestOrderPageUrl(tableLabel) {
  if (typeof window === 'undefined') return '';
  const u = new URL(appBasePath(), window.location.origin);
  u.searchParams.set('table', String(tableLabel ?? '').trim());
  return u.href;
}
