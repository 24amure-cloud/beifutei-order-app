/** サイドメニュー客席（オーナー編集の初期値） */
export const DEFAULT_SIDE_DISH_SECTIONS = [
  {
    id: 'sd-sec-hero',
    layout: 'hero',
    titleJa: 'おすすめ（大カード）',
    items: [
      {
        id: 'sd-frank',
        name: '生BIGフランク3種盛り',
        price: 980,
        image: '名称未設定-2_0000_xo-se-ji.png',
        imageLayout: 'large',
      },
    ],
  },
  {
    id: 'sd-sec-drinks',
    layout: 'drinks',
    titleJa: 'おすすめのお酒',
    titleKey: 'sd_recommend_title',
    items: [
      { id: 'sd-drink-beer', name: 'グラス生ビール（一番搾り）', price: 600, image: 'gurasubi-ru.webp', imageLayout: 'photo' },
      { id: 'sd-drink-highball', name: 'ハイボール', price: 600, image: 'haibo-ru.png', imageLayout: 'photo' },
      { id: 'sd-drink-lemon-sour', name: 'レモンサワー', price: 600, image: 'remonsawa-.jpg', imageLayout: 'photo' },
    ],
  },
  {
    id: 'sd-sec-toriaezu',
    layout: 'list-images',
    titleJa: 'とりあえず',
    titleKey: 'sd_section_toriaezu',
    items: [
      { id: 'sd-pickles', name: '自家製ピクルス盛り', price: 560, image: '名称未設定-2_0007_pikurusu.png', imageLayout: 'medium' },
      { id: 'sd-edamame', name: '塩ゆで枝豆', price: 450, image: '名称未設定-2_0006_edamame.png', imageLayout: 'medium' },
    ],
  },
  {
    id: 'sd-sec-popular',
    layout: 'list-images-foot',
    titleJa: 'みんな大好き',
    titleKey: 'sd_section_popular',
    items: [
      { id: 'sd-wiener', name: '赤ウインナー', price: 580, image: '名称未設定-2_0001_potato.png', imageLayout: 'round' },
      { id: 'sd-potato', name: 'シューストポテト', price: 580, image: '名称未設定-2_0001_potato.png', imageLayout: 'round' },
      { id: 'sd-nugget', name: 'チキンナゲット', price: 580, image: '名称未設定-2_0003_nagetto.png', imageLayout: 'round' },
      { id: 'sd-hash', name: 'ひと口ハッシュドポテト', price: 560, image: '名称未設定-2_0002_hassyupotato.png', imageLayout: 'round' },
    ],
  },
  {
    id: 'sd-sec-snack',
    layout: 'list-images-foot',
    titleJa: '呑ませる一皿',
    titleKey: 'sd_section_drink_snack',
    items: [
      { id: 'sd-jerky', name: '牛タンジャーキー', price: 860, image: '名称未設定-2_0005_jya-ki-.png', imageLayout: 'medium' },
      { id: 'sd-karaage', name: 'Yum特性から揚げ', price: 790, image: '名称未設定-1_0004_karaage.png', imageLayout: 'medium' },
      { id: 'sd-uzura', name: 'うずら味玉（5粒）', price: 450, image: '名称未設定-1_0002_uZURA.png', imageLayout: 'medium' },
      { id: 'sd-snack-chashu', name: 'おつまみチャーシュー', price: 600, image: '名称未設定-1_0000_tya-syu-.png', imageLayout: 'medium' },
    ],
  },
];
