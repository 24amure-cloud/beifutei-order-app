import {
  ALCOHOL_CHARGE_AFTER_21_YEN,
  ALCOHOL_CHARGE_BEFORE_21_YEN,
} from './alcoholTableCharge.js';

/** 伝票後入力クイックに常時表示する追加項目 */
export const MANUAL_LEDGER_FIXED_EXTRAS = [
  {
    itemId: 'ledger-charge-before-21',
    itemName: 'チャージ料（21時前）',
    price: ALCOHOL_CHARGE_BEFORE_21_YEN,
    kind: 'other',
    groupId: 'ledger-fixed-extra',
    sectionTitle: '追加項目',
  },
  {
    itemId: 'ledger-charge-after-21',
    itemName: 'チャージ料（21時以降）',
    price: ALCOHOL_CHARGE_AFTER_21_YEN,
    kind: 'other',
    groupId: 'ledger-fixed-extra',
    sectionTitle: '追加項目',
  },
  {
    itemId: 'nm-shot-staff-drink',
    itemName: 'スタッフドリンク（別料金）',
    price: 700,
    kind: 'drink',
    groupId: 'ledger-fixed-extra',
    sectionTitle: '追加項目',
  },
];
