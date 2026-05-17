import fs from 'fs';

const filePath = new URL('../src/KitchenApp.jsx', import.meta.url);
let s = fs.readFileSync(filePath, 'utf8');

const histStartAlt = '                            <motion className="kitchen-table-status__history">';
const histStart = '                            <div className="kitchen-table-status__history">';
const actionsStart = '                            <div className="kitchen-table-status__actions">';
const slipSectionStart =
  '\n                <section className="kitchen-orders kitchen-orders--in-hub kitchen-slip-ledger"';
const flowNoteStart =
  '\n                <section className="kitchen-panel kitchen-panel--muted kitchen-flow-note">';

const replacement = `                            <section className="kitchen-table-status__orders" aria-label="注文と伝票">
                              {pendingList.length > 0 ? (
                                <>
                                  <h3 className="kitchen-table-status__orders-heading">未提供</h3>
                                  <ul className="kitchen-table-status__hist-list">
                                    {pendingList.map((o) => {
                                      const meta = orderKindMeta(o);
                                      return (
                                        <li key={o.id} className="kitchen-table-status__hist-row">
                                          <span aria-hidden>{meta.emoji}</span>
                                          <span className="kitchen-table-status__hist-name">{meta.firstLine}</span>
                                          <span className="kitchen-table-status__st kitchen-table-status__st--wait">
                                            未提供
                                          </span>
                                          <button
                                            type="button"
                                            className="kitchen-table-status__hist-serve"
                                            onClick={() => markOrderServed(o.id)}
                                          >
                                            提供済
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </>
                              ) : null}
                              {servedList.length > 0 ? (
                                <>
                                  <h3 className="kitchen-table-status__orders-heading">提供済・伝票</h3>
                                  <ul className="kitchen-table-status__slip-list">
                                    {servedList.map((o) => (
                                      <li
                                        key={o.id}
                                        className={\`kitchen-table-status__slip-row\${
                                          isNomihodaiChargedExtra(o) ? ' kitchen-table-status__slip-row--nh-extra' : ''
                                        }\`}
                                      >
                                        <div className="kitchen-table-status__slip-main">
                                          <span className="kitchen-table-status__slip-name">{o.itemName}</span>
                                          <span className="kitchen-table-status__slip-meta">
                                            {orderLineSlipMetaPrice(o)} /{' '}
                                            {o.createdAt ? fmtTime(o.createdAt) : '--:--'}
                                          </span>
                                        </div>
                                        <OrderBillingToggle
                                          orderId={o.id}
                                          isNomihodai={nhToggleShowsNomihodaiActive(o)}
                                          onSetNomihodai={setOrderIsNomihodai}
                                          compact
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : null}
                              {pendingList.length === 0 && servedList.length === 0 ? (
                                <p className="kitchen-table-status__orders-empty">注文・伝票明細はまだありません</p>
                              ) : null}
                            </section>

                            <div className="kitchen-slip-total kitchen-slip-total--in-card">
                              <div>通常提供 {slip.normalCount}点</div>
                              <div>飲み放題提供 {slip.nomihodaiCount}点</motion>
                              <div>通常小計（税込）￥{slip.normalSubtotal.toLocaleString()}</div>
                              {slip.nomihodaiPlanYen > 0 ? (
                                <div>飲み放題プラン（税込）￥{slip.nomihodaiPlanYen.toLocaleString()}</motion>
                              ) : null}
                              {(slip.alcoholChargeYen ?? 0) > 0 ? (
                                <div className="kitchen-slip-total__alcohol">
                                  {getAlcoholTableCharge(session, label).lineName} ￥
                                  {(slip.alcoholChargeYen ?? 0).toLocaleString()}
                                </div>
                              ) : null}
                              <strong>合計（税込）￥{slip.slipGrandTotal.toLocaleString()}</strong>
                            </div>

                            <motion className="kitchen-table-status__foot">
                              <button
                                type="button"
                                className="kitchen-table-status__verbal"
                                onClick={() => setVerbalOrderTable(label)}
                              >
                                口頭注文
                              </button>
                              <button
                                type="button"
                                className="kitchen-btn kitchen-btn--checkout kitchen-table-status__checkout"
                                disabled={
                                  slip.normalCount + slip.nomihodaiCount === 0 &&
                                  slip.nomihodaiPlanYen <= 0 &&
                                  (slip.alcoholChargeYen ?? 0) <= 0
                                }
                                onClick={() => setCheckoutPage({ tableId: slip.tableId, tableLabel: slip.tableLabel })}
                              >
                                会計
                              </button>
                              <button
                                type="button"
                                className="kitchen-table-status__detail"
                                onClick={() => setTableDetailLabel(label)}
                              >
                                全履歴
                              </button>
                            </div>`;

// Fix any accidental motion tags in this script file itself
const fixed = replacement.replace(/<\/?motion\b[^>]*>/g, (m) =>
  m.startsWith('</') ? '</motion>' : m.replace('motion', 'motion')
);
const fixed2 = fixed
  .replace(/<motion\b/g, '<div')
  .replace(/<\/motion>/g, '</div>');

let startIdx = s.indexOf(histStart);
if (startIdx === -1) startIdx = s.indexOf(histStartAlt);
const actionsIdx = s.indexOf(actionsStart, startIdx);
const actionsEnd = s.indexOf('                            </div>\n                          </article>', actionsIdx);

if (startIdx === -1 || actionsIdx === -1 || actionsEnd === -1) {
  console.error('markers not found', { startIdx, actionsIdx, actionsEnd });
  process.exit(1);
}

let merged = s.slice(0, startIdx) + fixed2 + s.slice(actionsEnd);

const slipIdx = merged.indexOf(slipSectionStart);
const flowIdx = merged.indexOf(flowNoteStart, slipIdx);
if (slipIdx === -1 || flowIdx === -1) {
  console.error('slip section not found', { slipIdx, flowIdx });
  process.exit(1);
}
merged = merged.slice(0, slipIdx) + merged.slice(flowIdx);

fs.writeFileSync(filePath, merged);
console.log('merged table hub OK');
