import { getAlcoholTableCharge } from './alcoholTableCharge.js';
import { getNomihodaiForTable } from './nomihodaiSession.js';

/** 伝票サマリー（提供済カードに無い卓でも飲み放題プランのみの会計に対応） */
export function resolveSlipBundleForTableLabel(servedByTable, session, tableLabel) {
  const tl = String(tableLabel);
  const found = servedByTable.find((t) => String(t.tableLabel) === tl);
  const nh = getNomihodaiForTable(session, tl);
  const nomihodaiPlanYen = nh?.active ? Math.max(0, Number(nh.billTotal) || 0) : 0;
  const alcoholYen = getAlcoholTableCharge(session, tl).totalYen;
  if (found) {
    const plan = nh?.active ? nomihodaiPlanYen : Math.max(0, Number(found.nomihodaiPlanYen) || 0);
    return {
      ...found,
      nomihodaiPlanYen: plan,
      alcoholChargeYen: alcoholYen,
      slipGrandTotal: found.normalSubtotal + plan + alcoholYen,
    };
  }
  return {
    key: `default::${tl}`,
    tableId: 'default',
    tableLabel: tl,
    orders: [],
    normalSubtotal: 0,
    normalCount: 0,
    nomihodaiCount: 0,
    nomihodaiPlanYen,
    alcoholChargeYen: alcoholYen,
    slipGrandTotal: nomihodaiPlanYen + alcoholYen,
  };
}

/** 注文履歴（全ステータス）＋稼働中NHプランから、税込の目安合計 */
export function computeTableHistoryTotals(session, tableLabel, orders) {
  const tl = String(tableLabel);
  const list = Array.isArray(orders) ? orders : [];
  let normalSubtotal = 0;
  for (const o of list) {
    const yen = Math.max(0, Number(o.itemPrice) || 0);
    if (!o.isNomihodai) normalSubtotal += yen;
    else if (yen > 0) normalSubtotal += yen;
  }
  const nh = getNomihodaiForTable(session, tl);
  const nomihodaiPlanYen = nh?.active ? Math.max(0, Number(nh.billTotal) || 0) : 0;
  const ac = getAlcoholTableCharge(session, tl);
  return {
    normalSubtotal,
    nomihodaiPlanYen,
    alcoholChargeYen: ac.totalYen,
    grandTaxIn: normalSubtotal + nomihodaiPlanYen + ac.totalYen,
  };
}
