/**
 * 飲み放題カタログ初期データ（マスターで上書き可能・localStorage に保存）
 * 表示順：ビール → ハイボール → 焼酎 → カクテル（チューハイ）→ ワイン → ソフトドリンク
 * `name` … 厨房・伝票・注文行（日本語）
 * `nameEn` … 客席タブレットが英語 UI のときの表示（未設定時は `name` を表示）
 */
export const DEFAULT_NOMIHODAI_CATALOG = [
  {
    id: 'nh-cat-beer',
    titleJa: 'ビール',
    titleEn: 'BEER',
    items: [
      { id: 'nh-beer-ichiban', name: 'キリン一番搾り（グラス）', nameEn: 'Kirin Ichiban (glass)' },
      { id: 'nh-beer-asahi', name: 'アサヒスーパードライ（中瓶）', nameEn: 'Asahi Super Dry (medium bottle)' },
      { id: 'nh-beer-classic', name: 'サッポロクラシック（中瓶）', nameEn: 'Sapporo Classic (medium bottle)' },
      { id: 'nh-beer-shandy', name: 'シャンディガフ', nameEn: 'Shandy Gaff' },
    ],
  },
  {
    id: 'nh-cat-highball',
    titleJa: 'ハイボール',
    titleEn: 'HIGHBALL',
    items: [
      { id: 'nh-hb-nikka', name: 'ブラックニッカハイボール', nameEn: 'Black Nikka Highball' },
      { id: 'nh-hb-jim', name: 'ジムビームハイボール', nameEn: 'Jim Beam Highball' },
      { id: 'nh-hb-kaku', name: '角ハイボール', nameEn: 'Kakubin Highball' },
    ],
  },
  {
    id: 'nh-cat-shochu',
    titleJa: '焼酎',
    titleEn: 'SHOCHU',
    items: [
      { id: 'nh-shochu-kuro', name: '黒霧島（ロック／ソーダ割）', nameEn: 'Kuro Kirishima (on the rocks / soda)' },
      { id: 'nh-shochu-shiro', name: '白岳しろ（ロック／ソーダ割）', nameEn: 'Shirataku Shiro (on the rocks / soda)' },
      { id: 'nh-shochu-mugi', name: '麦焼酎（おすすめ）', nameEn: 'Barley shochu (recommended)' },
    ],
  },
  {
    id: 'nh-cat-cocktail',
    titleJa: 'カクテル（現在チューハイ）',
    titleEn: 'COCKTAIL',
    items: [
      { id: 'nh-sour-lemon', name: 'レモンサワー', nameEn: 'Lemon sour' },
      { id: 'nh-sour-yuzu', name: 'ゆずサワー', nameEn: 'Yuzu sour' },
      { id: 'nh-sour-ume', name: 'うめサワー', nameEn: 'Plum sour' },
      { id: 'nh-sour-grape', name: '巨峰サワー', nameEn: 'Kyoho grape sour' },
      { id: 'nh-chu-green', name: '緑茶ハイ', nameEn: 'Green tea highball' },
      { id: 'nh-chu-oolong', name: '烏龍茶ハイ', nameEn: 'Oolong tea highball' },
    ],
  },
  {
    id: 'nh-cat-wine',
    titleJa: 'ワイン',
    titleEn: 'WINE',
    items: [
      { id: 'nh-wine-glass-r', name: 'グラスワイン（赤）', nameEn: 'Glass wine (red)' },
      { id: 'nh-wine-glass-w', name: 'グラスワイン（白）', nameEn: 'Glass wine (white)' },
      { id: 'nh-wine-kalimotxo', name: 'カリモーチョ', nameEn: 'Kalimotxo' },
    ],
  },
  {
    id: 'nh-cat-soft',
    titleJa: 'ソフトドリンク',
    titleEn: 'SOFT DRINK',
    items: [
      { id: 'nh-soft-cola', name: 'コーラ', nameEn: 'Cola' },
      { id: 'nh-soft-oolong', name: 'ウーロン茶', nameEn: 'Oolong tea' },
      { id: 'nh-soft-green', name: '緑茶', nameEn: 'Green tea' },
    ],
  },
];
