/** 飲み放題プランの時間・延長・料金（UI・厨房・セッションで共通） */

export const NOMIHODAI_BASE_MS = 90 * 60 * 1000;
/** 90分経過後の延長は20分単位 */
export const NOMIHODAI_EXTENSION_MS = 20 * 60 * 1000;
/** 延長1回あたり（男女共通・税込） */
export const NOMIHODAI_EXTENSION_PRICE_YEN = 600;
/** 終了前ラストオーダー（終了の何分前か）— 延長単位に合わせ20分 */
export const NOMIHODAI_LO_BEFORE_END_MS = 20 * 60 * 1000;

export const NOMIHODAI_BASE_MINUTES = 90;
export const NOMIHODAI_EXTENSION_MINUTES = 20;

/** 会計完了（厨房終了）後、この時間経過で SESSION CLOSED 表示（目安 3〜5 分） */
export const NOMIHODAI_SESSION_CLOSED_DELAY_MS = 4 * 60 * 1000;
