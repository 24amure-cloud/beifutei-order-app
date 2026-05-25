/**
 * 客席・厨房スタッフで画像パスを分離（スタッフ調整が客席UIに波及しないようにする）
 * スタッフ用は public/staff-retail/ 配下（初回は客席と同画像をコピーして配置）
 */

const ASSET_BASE = import.meta.env.BASE_URL;

function encodeAssetPath(path) {
  const normalized = String(path).replace(/^\//, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return ASSET_BASE || '/';
  const encoded = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const base = ASSET_BASE || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${encoded}`;
}

/** @param {'guest'|'staff'} scope */
export function retailAssetUrl(scope, path) {
  const p = String(path).replace(/^\//, '');
  if (scope === 'staff') {
    return encodeAssetPath(p.startsWith('staff-retail/') ? p : `staff-retail/${p}`);
  }
  return encodeAssetPath(p);
}

/** @param {'guest'|'staff'} scope */
export function retailCssBgUrl(scope, path) {
  return `url("${retailAssetUrl(scope, path)}")`;
}

export const GUEST_PAGE_HEADERS = {
  cafe: ['名称未設定-5_0006_kafedorinnkuhedda-.png', 'kafedorinnkuhedda-.png'],
  fruit: ['名称未設定-5_0002_sofutohedda-.png', 'sofutohedda-.png'],
  takeout: ['名称未設定-5_0000_sui-tuhedda-.png', 'sui-tuhedda-.png'],
};

/** 厨房カフェ（コンパクトUI・小さめ画像） */
export const STAFF_CAFE_IMAGES = {
  hotCoffee: '名称未設定-1_0002_hotcoffe.png',
  iceCoffee: '名称未設定-1_0004_icecoffe.png',
  coffeeBadge: '名称未設定-1_0005_coffesetumei.png',
  iceLatte: '名称未設定-1_0003_Icelate.png',
  latteBadge: '名称未設定-1_0008_latesetumei.png',
  strawberry: '名称未設定-1_0001_ichigomiruku.png',
  strawberryBadge: '名称未設定-1_0006_ichigosetumei.png',
  chocolata: '名称未設定-1_0000_chocolata.png',
  chocolataBadge: '名称未設定-1_0007_chocosetumei.png',
};

/** 客席カフェ（従来パス・ルート直下） */
export const GUEST_CAFE_IMAGES = { ...STAFF_CAFE_IMAGES };

/** 客席ソフトクリーム（public ルート直下・スタッフ画面とは別管理） */
export const GUEST_FRUIT_IMAGES = {
  bearLogo: 'fruit-bear-logo.png',
  fruitSoftRegular: '名称未設定-1_0000_regyura-furusofu.png',
  fruitSoftMini: '名称未設定-2_0000_mini_furusofu.png',
  gelatoCone: '名称未設定-1_0001_jeranamako-nn.png',
  gelatoCup: '名称未設定-1_0003_jeranamakappu.png',
  affogato: '名称未設定-2_0001_afoga-do.png',
};

/** スタッフ用にコピーすべきファイル名一覧（npm run sync:staff-retail-assets） */
export const STAFF_RETAIL_ASSET_FILENAMES = [...new Set(Object.values(STAFF_CAFE_IMAGES))];
