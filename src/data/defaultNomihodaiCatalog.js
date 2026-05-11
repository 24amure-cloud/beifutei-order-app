/**
 * 飲み放題カタログ初期データ（マスターで上書き可能・localStorage に保存）
 * 表示順：ビール → ハイボール → 焼酎 → カクテル（チューハイ）→ ワイン → ソフトドリンク
 */
export const DEFAULT_NOMIHODAI_CATALOG = [
  {
    id: 'nh-cat-beer',
    titleJa: 'ビール',
    titleEn: 'BEER',
    items: [
      { id: 'nh-beer-ichiban', name: 'キリン一番搾り（グラス）' },
      { id: 'nh-beer-asahi', name: 'アサヒスーパードライ（中瓶）' },
      { id: 'nh-beer-classic', name: 'サッポロクラシック（中瓶）' },
      { id: 'nh-beer-shandy', name: 'シャンディガフ' },
    ],
  },
  {
    id: 'nh-cat-highball',
    titleJa: 'ハイボール',
    titleEn: 'HIGHBALL',
    items: [
      { id: 'nh-hb-nikka', name: 'ブラックニッカハイボール' },
      { id: 'nh-hb-jim', name: 'ジムビームハイボール' },
      { id: 'nh-hb-kaku', name: '角ハイボール' },
    ],
  },
  {
    id: 'nh-cat-shochu',
    titleJa: '焼酎',
    titleEn: 'SHOCHU',
    items: [
      { id: 'nh-shochu-kuro', name: '黒霧島（ロック／ソーダ割）' },
      { id: 'nh-shochu-shiro', name: '白岳しろ（ロック／ソーダ割）' },
      { id: 'nh-shochu-mugi', name: '麦焼酎（おすすめ）' },
    ],
  },
  {
    id: 'nh-cat-cocktail',
    titleJa: 'カクテル（現在チューハイ）',
    titleEn: 'COCKTAIL',
    items: [
      { id: 'nh-sour-lemon', name: 'レモンサワー' },
      { id: 'nh-sour-yuzu', name: 'ゆずサワー' },
      { id: 'nh-sour-ume', name: 'うめサワー' },
      { id: 'nh-sour-grape', name: '巨峰サワー' },
      { id: 'nh-chu-green', name: '緑茶ハイ' },
      { id: 'nh-chu-oolong', name: '烏龍茶ハイ' },
    ],
  },
  {
    id: 'nh-cat-wine',
    titleJa: 'ワイン',
    titleEn: 'WINE',
    items: [
      { id: 'nh-wine-glass-r', name: 'グラスワイン（赤）' },
      { id: 'nh-wine-glass-w', name: 'グラスワイン（白）' },
      { id: 'nh-wine-kalimotxo', name: 'カリモーチョ' },
    ],
  },
  {
    id: 'nh-cat-soft',
    titleJa: 'ソフトドリンク',
    titleEn: 'SOFT DRINK',
    items: [
      { id: 'nh-soft-cola', name: 'コーラ' },
      { id: 'nh-soft-oolong', name: 'ウーロン茶' },
      { id: 'nh-soft-green', name: '緑茶' },
    ],
  },
];
