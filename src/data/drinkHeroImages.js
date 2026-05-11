/**
 * public 直下のヒーロー画像（名称未設定-7_* は Desktop 側から public にコピー済み想定）
 */
const UNIVERSAL_FALLBACK = 'sd-drink-highball.png';

function candidates(primary, ...fallbacks) {
  const arr = [primary, ...fallbacks].filter(Boolean);
  arr.push(UNIVERSAL_FALLBACK);
  return arr;
}

/** 店舗ドリンクメニュー（セクション id） */
export const DRINK_SECTION_HERO_FILES = {
  whisky: candidates(
    '名称未設定-7_0000_haibo-ru.png',
    'haibo-ru.png',
    'sd-drink-highball.png'
  ),
  beer: candidates('名称未設定-7_0001_beer.png', 'gurasubi-ru.webp', 'sd-drink-glass-beer.png'),
  wine: candidates('名称未設定-7_0002_wine.png'),
  shochu: candidates('名称未設定-7_0002_wine.png'),
  sour: candidates(
    '名称未設定-7_0006_sawa-.png',
    'sd-drink-lemon-sour.png',
    'remonsawa-.jpg'
  ),
  cocktail: candidates('名称未設定-7_0003_coctel1.png'),
  soft: candidates('名称未設定-7_0005_ko-ra.png', 'sofutohedda-.png'),
};

/** 飲み放題カード用スロット（UIメモリ／配色・画像の対応） */
export const NOMIHODAI_VISUAL_SLOTS = [
  'highball',
  'beer',
  'wine',
  'cocktail',
  'gintonic',
  'shochu',
  'soft',
  'sour',
];

const SLOT_PRIMARY_IMAGE = {
  highball: '名称未設定-7_0000_haibo-ru.png',
  beer: '名称未設定-7_0001_beer.png',
  wine: '名称未設定-7_0002_wine.png',
  cocktail: '名称未設定-7_0003_coctel1.png',
  gintonic: '名称未設定-7_0004_jintonic.png',
  soft: '名称未設定-7_0005_ko-ra.png',
  sour: '名称未設定-7_0006_sawa-.png',
  shochu: '名称未設定-7_0002_wine.png',
};

function heroCandidatesForSlot(slot) {
  const primary = SLOT_PRIMARY_IMAGE[slot];
  if (!primary) return candidates(SLOT_PRIMARY_IMAGE.cocktail);
  return candidates(primary, SLOT_PRIMARY_IMAGE.wine);
}

const LEGACY_CAT_SLOT = {
  'nh-cat-highball': 'highball',
  'nh-cat-beer': 'beer',
  'nh-cat-wine': 'wine',
  'nh-cat-shochu': 'shochu',
  'nh-cat-cocktail': 'cocktail',
  'nh-cat-sour': 'sour',
  'nh-cat-chuhai': 'cocktail',
  'nh-cat-soft': 'soft',
};

/** マスター編集のカテゴリ名からスロットを推定 */
export function resolveNomihodaiVisualSlot(cat) {
  if (!cat) return 'cocktail';
  const legacy = LEGACY_CAT_SLOT[cat.id];
  if (legacy) return legacy;
  const blob = `${cat.titleEn || ''} ${cat.titleJa || ''}`.toUpperCase();
  if (/WHISKY|HIGHBALL|ハイボール|ウイスキー/.test(blob)) return 'highball';
  if (/WINE|ワイン/.test(blob)) return 'wine';
  if (/BEER|ビール/.test(blob)) return 'beer';
  if (/JIN\s*TONIC|GIN|ジントニック|ジン/.test(blob)) return 'gintonic';
  if (/SHOCHU|焼酎/.test(blob)) return 'shochu';
  if (/SOUR|サワー/.test(blob)) return 'sour';
  if (/COCKTAIL|カクテル|チューハイ|現在チューハイ|ウーロン茶ハイ|緑茶ハイ/.test(blob)) return 'cocktail';
  if (/SOFT|ソフト|コーラ|ジュース|ウーロン茶|緑茶|オレンジ/.test(blob)) return 'soft';
  return NOMIHODAI_VISUAL_SLOTS[Math.abs(String(cat.id).length + (cat.titleJa || '').length) % NOMIHODAI_VISUAL_SLOTS.length];
}

export function getDrinkSectionHeroCandidates(sectionId) {
  const list = DRINK_SECTION_HERO_FILES[sectionId];
  return list?.length ? list : DRINK_SECTION_HERO_FILES.soft;
}

/** @deprecated 互換：インデックスだけで割り当て */
export function getNomihodaiHeroCandidates(categoryId, cardIndex = 0) {
  const mapped = LEGACY_CAT_SLOT[categoryId];
  if (mapped) return heroCandidatesForSlot(mapped);
  const key = NOMIHODAI_VISUAL_SLOTS[Math.abs(cardIndex) % NOMIHODAI_VISUAL_SLOTS.length];
  return heroCandidatesForSlot(key);
}

export function getNomihodaiHeroCandidatesForCategory(cat) {
  return heroCandidatesForSlot(resolveNomihodaiVisualSlot(cat));
}
