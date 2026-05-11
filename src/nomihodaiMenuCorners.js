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

export const NOMIHODAI_SECTION_EMPTY_HINTS = {
  beer: 'マスターで「ビール」「BEER」を含むカテゴリを追加すると表示されます。',
  highball: 'マスターで「ハイボール」「HIGHBALL」を含むカテゴリを追加すると表示されます。',
  shochu: 'マスターで「焼酎」「SHOCHU」を含むカテゴリを追加すると表示されます。',
  cocktail:
    'マスターで「カクテル」「チューハイ」「サワー」「ジントニック」等を含むカテゴリを追加すると表示されます。',
  wine: 'マスターで「ワイン」「WINE」を含むカテゴリを追加すると表示されます。',
  soft: 'マスターで「ソフト」「ジュース」「ウーロン」等を含むカテゴリを追加すると表示されます。',
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
