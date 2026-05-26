/** public 配下のパス（Git LFS 不要・Vercel 配信向け） */
export const GUEST_PROMO_DEFAULT_IMAGE_PATHS = [
  'haibo-ru.png',
  'fruit-bear-logo.png',
  'aburasobahedda-.png',
  'chizuaburasoba.png',
  'gurasubi-ru.webp',
  'remonsawa-.jpg',
  'kukki-hasukappu.png',
  'furusan-orange.jpg',
];

/** 動画がこれ未満なら LFS ポインタ等の壊れたファイルとみなす */
export const GUEST_PROMO_MIN_VALID_VIDEO_BYTES = 50_000;
