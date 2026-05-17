import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/KitchenCheckoutModal.jsx');
let s = fs.readFileSync(p, 'utf8');
const D = 'di' + 'v';
const from = `<${D} className="kitchen-checkout-guest-overlay">`;
const to = `<${D} className="kitchen-checkout-guest-overlay" role="dialog" aria-modal="true" aria-labelledby="kitchen-checkout-guest-title">`;
if (s.includes('aria-labelledby="kitchen-checkout-guest-title"')) {
  console.log('already ok');
} else if (s.includes(from)) {
  s = s.replace(from, to);
  fs.writeFileSync(p, s);
  console.log('aria added');
} else {
  console.error('not found');
  process.exit(1);
}
