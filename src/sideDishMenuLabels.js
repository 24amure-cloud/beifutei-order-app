import { DEFAULT_SIDE_DISH_SECTIONS } from './data/defaultSideDishMenu.js';

/** オーナー画面のカテゴリナビ用（titleJa 未入力時） */
export const SIDE_DISH_LAYOUT_LABELS = {
  hero: 'おすすめ（大カード）',
  drinks: 'おすすめドリンク',
  'list-images': 'とりあえず（画像付き）',
  'list-images-foot': 'サイド一覧（画像下）',
  list: '一覧',
};

const defaultTitleJaById = Object.fromEntries(
  DEFAULT_SIDE_DISH_SECTIONS.map((s) => [s.id, s.titleJa]),
);

/** サイドメニューブロックの表示名（オーナー左ナビ・見出し） */
export function sideDishSectionNavLabel(sec) {
  const ja = typeof sec?.titleJa === 'string' ? sec.titleJa.trim() : '';
  if (ja) return ja;
  const fromDefault = defaultTitleJaById[sec?.id];
  if (fromDefault) return fromDefault;
  return SIDE_DISH_LAYOUT_LABELS[sec?.layout] || '（無題）';
}

/** localStorage 読み込み時：既知 ID の titleJa を初期データから補完 */
export function enrichSideDishSections(sections) {
  return (sections || []).map((sec) => {
    const ja = typeof sec.titleJa === 'string' ? sec.titleJa.trim() : '';
    if (ja) return sec;
    const fallback = defaultTitleJaById[sec.id] || SIDE_DISH_LAYOUT_LABELS[sec.layout];
    return fallback ? { ...sec, titleJa: fallback } : sec;
  });
}
