/**
 * 卓チャージ（卓ごと・スタッフ設定・税込）
 * 目安として 21:00 前後で 500／800 円／名を返すヘルパーあり。実際の金額は店舗入力。
 */

import { normalizeTableLabelKey } from './nomihodaiSession.js';

export const ALCOHOL_CHARGE_BEFORE_21_YEN = 500;
export const ALCOHOL_CHARGE_AFTER_21_YEN = 800;

/** 端末ローカル時刻で当日 21:00 未満→500、21:00 以上→800（いずれも税込／名） */
export function alcoholChargeYenPerPersonFromNow(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins < 21 * 60 ? ALCOHOL_CHARGE_BEFORE_21_YEN : ALCOHOL_CHARGE_AFTER_21_YEN;
}

/** @param {number} yenPerPerson */
export function alcoholChargeBandLabelJa(yenPerPerson) {
  const y = Number(yenPerPerson);
  if (y === ALCOHOL_CHARGE_BEFORE_21_YEN) return '21時前';
  if (y === ALCOHOL_CHARGE_AFTER_21_YEN) return '21時以降';
  return '';
}

/**
 * @param {{ alcoholChargeByLabel?: Record<string, { people: number, yenPerPerson: number }> }} session
 * @param {string|number} tableLabel
 */
export function getAlcoholTableCharge(session, tableLabel) {
  const tl = normalizeTableLabelKey(tableLabel) || String(tableLabel ?? '').trim();
  const by = session?.alcoholChargeByLabel;
  let raw;
  if (by && typeof by === 'object') {
    raw = by[tl];
    if (raw == null) {
      for (const [k, v] of Object.entries(by)) {
        if (normalizeTableLabelKey(k) === tl) {
          raw = v;
          break;
        }
      }
    }
  }
  const people = Math.max(0, Math.min(99, Number(raw?.people) || 0));
  const yenPerPerson = Math.max(0, Number(raw?.yenPerPerson) || 0);
  const totalYen = people > 0 && yenPerPerson > 0 ? people * yenPerPerson : 0;
  const band = alcoholChargeBandLabelJa(yenPerPerson);
  const lineName =
    totalYen > 0 && band
      ? `チャージ料（${band} ${yenPerPerson.toLocaleString()}円×${people}名・税込）`
      : totalYen > 0
        ? `チャージ料（${yenPerPerson.toLocaleString()}円×${people}名・税込）`
        : '';
  return { people, yenPerPerson, totalYen, lineName, band };
}

/**
 * 卓タブレット表示用（厨房向け item 名とは独立）。locale が en のとき英語表記。
 * @param {'ja' | 'en'} locale
 */
export function formatAlcoholChargeLineForGuest(session, tableLabel, locale) {
  const c = getAlcoholTableCharge(session, tableLabel);
  if (c.totalYen <= 0) return '';
  if (locale !== 'en') return c.lineName;
  const band =
    c.yenPerPerson === ALCOHOL_CHARGE_BEFORE_21_YEN
      ? 'before 9 p.m.'
      : c.yenPerPerson === ALCOHOL_CHARGE_AFTER_21_YEN
        ? 'after 9 p.m.'
        : '';
  if (band) {
    return `Cover charge (${band} ¥${c.yenPerPerson.toLocaleString()} × ${c.people} guests, incl. tax)`;
  }
  return `Cover charge (¥${c.yenPerPerson.toLocaleString()} × ${c.people} guests, incl. tax)`;
}
