import { normalizeTableLabelKey } from './nomihodaiSession.js';

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
  return buildKitchenPageUrl('');
}

/** 厨房スタッフ画面（卓番は ?table= で指定） */
export function buildKitchenPageUrl(tableLabel) {
  if (typeof window === 'undefined') return '';
  const u = new URL('kitchen.html', siteBaseAbsUrl());
  const lbl = String(tableLabel ?? '').trim();
  if (lbl) u.searchParams.set('table', lbl);
  return u.href;
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

/** 客席 URL の ?table= を正規化して返す（無ければ ''） */
export function readGuestTableLabelFromUrl(location) {
  if (typeof window === 'undefined' && !location) return '';
  const search = location?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const tbl = new URLSearchParams(search).get('table');
  if (!tbl || !String(tbl).trim()) return '';
  return normalizeTableLabelKey(String(tbl).trim()) || '';
}
