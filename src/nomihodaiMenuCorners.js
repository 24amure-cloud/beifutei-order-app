import { resolveNomihodaiVisualSlot } from './data/drinkHeroImages.js';

/** ゲスト画面の並び：ビール → … → ソフト（ショットは別コンポーネントで最後） */
export const NOMIHODAI_SECTION_KEYS = ['beer', 'highball', 'shochu', 'cocktail', 'wine', 'soft'];

/** 視覚スロット → 上記セクション */
const SLOT_TO_SECTION = {
  beer: 'beer',
  highball: 'highball',
  shochu: 'shochu',
  cocktail: 'cocktail',
  sour: 'cocktail',
  gintonic: 'cocktail',
  wine: 'wine',
  soft: 'soft',
};

/** guestUiStrings のキー（卓タブレットの言語に追従） */
export const NOMIHODAI_SECTION_EMPTY_HINT_KEYS = {
  beer: 'nh_empty_beer',
  highball: 'nh_empty_highball',
  shochu: 'nh_empty_shochu',
  cocktail: 'nh_empty_cocktail',
  wine: 'nh_empty_wine',
  soft: 'nh_empty_soft',
};

function emptyBuckets() {
  return {
    beer: [],
    highball: [],
    shochu: [],
    cocktail: [],
    wine: [],
    soft: [],
  };
}

/**
 * 飲み放題カタログを固定順セクションに分割（マスターの配列順は各セクション内の表示順に反映）
 */
export function partitionNomihodaiCatalog(catalog) {
  const buckets = emptyBuckets();
  for (const cat of catalog || []) {
    const slot = resolveNomihodaiVisualSlot(cat);
    const sec = SLOT_TO_SECTION[slot];
    const target = sec && buckets[sec] != null ? sec : 'cocktail';
    buckets[target].push(cat);
  }
  return buckets;
}
