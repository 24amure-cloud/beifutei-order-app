import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/KitchenApp.jsx');
let s = fs.readFileSync(p, 'utf8');

const start = '      {checkoutPage && checkoutSlip ? (';
const end = '\n\n      {tableDetailLabel ? (';
const replacement = `      {checkoutPage && checkoutSlip ? (
        <KitchenCheckoutModal
          tableLabel={checkoutPage.tableLabel}
          tableId={checkoutPage.tableId}
          checkoutSlip={checkoutSlip}
          session={session}
          memo={checkoutPageMemo}
          pendingCount={checkoutPendingCount}
          hasCheckoutRequest={!!session.checkoutRequestByLabel?.[checkoutPage.tableLabel]}
          onClose={() => setCheckoutPage(null)}
          onEditSlip={() => {
            setCheckoutPage(null);
            setStaffTab(STAFF_TABS.tableStatus);
          }}
          onFinalize={handleCheckoutPagePay}
        />
      ) : null}`;

const i = s.indexOf(start);
const j = s.indexOf(end, i);
if (i < 0 || j < 0) {
  console.error('markers', { i, j });
  process.exit(1);
}
s = s.slice(0, i) + replacement + s.slice(j);
fs.writeFileSync(p, s);
console.log('wired KitchenCheckoutModal');
