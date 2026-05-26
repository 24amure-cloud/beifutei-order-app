/** 客席スクリーンセーバー既定動画（public 配信・Git 通常コミット） */
export const GUEST_PROMO_DEFAULT_VIDEO_PATH = 'screensaver4.mp4';

/** 動画読み込み失敗時の画像ローテーション */
export const GUEST_PROMO_FALLBACK_IMAGE_PATHS = [
  'haibo-ru.png',
  'fruit-bear-logo.png',
  'aburasobahedda-.png',
  'chizuaburasoba.png',
  'gurasubi-ru.webp',
  'remonsawa-.jpg',
];

/** 動画がこれ未満なら LFS ポインタ等の壊れたファイルとみなす */
export const GUEST_PROMO_MIN_VALID_VIDEO_BYTES = 50_000;
