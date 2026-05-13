/** 卓タブレット英語表示：カート行・サイズ等（厨房向け `name` は変更しない） */

const NH_CART_ID = 'nomihodai-plan-charge';

const RETAIL_EN = {
  'sd-frank': 'Assorted BIG sausages (3 kinds)',
  'sd-drink-beer': 'Draft beer (Kirin Ichiban, glass)',
  'sd-drink-highball': 'Highball',
  'sd-drink-lemon-sour': 'Lemon sour',
  'sd-pickles': 'House pickle platter',
  'sd-edamame': 'Salted edamame',
  'sd-wiener': 'Red wiener sausage',
  'sd-potato': 'Choucroute-style potatoes',
  'sd-nugget': 'Chicken nuggets',
  'sd-hash': 'Mini hash browns',
  'sd-jerky': 'Beef tongue jerky',
  'sd-karaage': 'Yum-style karaage',
  'sd-uzura': 'Seasoned quail eggs (5)',
  'sd-snack-chashu': 'Snack chashu pork',
  'fr-affogato': 'Affogato',
  'pz-margherita': 'Margherita',
  'pz-genovese': 'Genovese',
  'pz-bismark': 'Bismark',
  'pz-quattro': 'Quattro formaggi',
  'ts-fr-itigo': 'Strawberry',
  'ts-fr-furu-tumix': 'Fruit mix',
  'ts-fr-golden-pine': 'Golden pineapple',
  'ts-fr-itigokiui': 'Kiwi & strawberry',
  'ts-fr-itigopain': 'Strawberry & pineapple',
  'ts-fr-ichigobanana': 'Strawberry & banana',
  'ts-fr-chocobanana': 'Banana chocolate',
  'ts-fr-orange': 'Orange',
  'ts-fr-kiui-mix': 'Kiwi mix',
  'ts-kk-hani': 'Honey pod\ncookie sandwich',
  'ts-kk-matcha': 'Matcha\ncookie sandwich',
  'ts-kk-hasukappu': 'Tomakomai haskap choco\ncookie sandwich',
  'ts-kk-nuts-choco': 'Nut chocolate\ncookie sandwich',
  'ts-kk-pine': 'Pineapple\ncookie sandwich',
  'ts-kk-peach': 'Peach\ncookie sandwich',
  'ts-kk-vanilla': 'Royal vanilla\ncookie sandwich',
  'ts-kk-straw': 'Strawberry\ncookie sandwich',
  'ts-sc-plain': 'Fermented butter scone',
  'ts-sc-choco': 'Cocoa scone',
  'ts-sc-matcha': 'Matcha scone',
  'ts-sc-caramel': 'Caramel scone',
  'ts-sc-maple': 'Maple scone',
  'ts-sc-namacream': 'Fresh cream scone',
  'ts-rt-1': 'Little rare cookie\n(1 pc)',
  'ts-rt-4': 'Little rare cookie\n(4 pcs)',
};

/** テイクアウトスイーツカードの表示名（客席のみ。カート `name` は日本語のまま） */
export function guestTakeoutItemDisplayName(item, locale) {
  if (locale !== 'en') return item.name;
  return RETAIL_EN[item.id] ?? item.name;
}

function guestCafeCartEnLine(id, ut) {
  const p = String(id).split('-');
  if (p[0] !== 'cafe') return null;
  if (p[1] === 'ameri' && p.length >= 4) {
    return ut('cafe_cart_coffee', { temp: p[2].toUpperCase(), size: p[3] });
  }
  if (p[1] === 'latte' && p.length >= 4) {
    return ut('cafe_cart_latte', { temp: p[2].toUpperCase(), size: p[3] });
  }
  if (p[1] === 'straw' && p.length >= 3) {
    return ut('cafe_cart_strawberry', { size: p[2] });
  }
  if (p[1] === 'choco' && p.length >= 3) {
    return ut('cafe_cart_chocolata', { size: p[2] });
  }
  return null;
}

function abuSizeKey(sizeJa) {
  if (sizeJa === '小') return 'abu_size_s';
  if (sizeJa === '大') return 'abu_size_l';
  return 'abu_size_m';
}

function abuBowlKey(bowlKey) {
  if (bowlKey === 'spicy' || bowlKey === 'cheese') return `abu_bowl_${bowlKey}`;
  if (bowlKey === 'negi') return 'abu_bowl_negi';
  return 'abu_bowl_normal';
}

/**
 * カート1行の客席表示名（英語時のみ日本語から変換）
 * @param {*} item
 * @param {'ja'|'en'} locale
 * @param {(k: string, v?: object) => string} ut
 * @param {{ people?: number, menCount?: number, womenCount?: number } | null} nh
 */
export function guestCartLineDisplay(item, locale, ut, nh) {
  if (locale !== 'en') return item.name;
  if (item.id === NH_CART_ID && nh) {
    if ((nh.menCount ?? 0) > 0 || (nh.womenCount ?? 0) > 0) {
      return ut('nh_cart_plan_mf', { m: nh.menCount ?? 0, f: nh.womenCount ?? 0 });
    }
    return ut('nh_cart_plan_n', { n: nh.people ?? 1 });
  }
  if (item.aburasobaDetail) {
    const d = item.aburasobaDetail;
    const bowl = ut(abuBowlKey(d.bowlKey));
    const sz = ut(abuSizeKey(d.size));
    const tops = (d.toppings || []).map((t) => (t.text && String(t.text).trim() ? t.text : t.name));
    const suffix = tops.length ? ` — ${tops.join(' · ')}` : '';
    return `${bowl} (${sz})${suffix}`;
  }
  const cafeLine = guestCafeCartEnLine(item.id, ut);
  if (cafeLine) return cafeLine;
  const sid = String(item.id);
  if (sid.startsWith('fr-soft-')) {
    const raw = sid.slice('fr-soft-'.length);
    const typeEn = raw === 'コーン' ? ut('fruit_soft_cone') : ut('fruit_soft_cup');
    return ut('fruit_cart_gelato', { type: typeEn });
  }
  if (sid.startsWith('fr-fruit-')) {
    const sz = sid.replace('fr-fruit-', '');
    const sizeEn = sz === 'ミニ' ? ut('fruit_size_mini') : ut('fruit_size_regular');
    return ut('fruit_cart_soft', { size: sizeEn });
  }
  const retail = RETAIL_EN[item.id];
  if (retail != null) return retail;
  if (item.nameEn != null && String(item.nameEn).trim() !== '') {
    return String(item.nameEn).trim();
  }
  return item.name;
}

/** トッピンググリッド・フロー内の表示名 */
export function guestAburasobaToppingLabel(topping, locale) {
  if (locale === 'en' && topping?.text) return topping.text;
  return topping?.name ?? '';
}

export function guestDrinkRowName(it, locale) {
  if (locale === 'en' && it?.nameEn != null && String(it.nameEn).trim() !== '') return String(it.nameEn).trim();
  return it?.name ?? '';
}

export function guestDrinkSectionHint(sec, locale) {
  if (locale === 'en' && sec?.hintEn != null && String(sec.hintEn).trim() !== '') return String(sec.hintEn).trim();
  return sec?.hint || '';
}
