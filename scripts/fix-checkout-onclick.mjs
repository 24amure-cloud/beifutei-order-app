import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/KitchenCheckoutModal.jsx');
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  /<div className="kitchen-checkout-page kitchen-checkout-page--done"> e\.stopPropagation\(\)}>/g,
  '<motion className="kitchen-checkout-page kitchen-checkout-page--done">'
);
s = s.replace(
  /<motion className="kitchen-checkout-page kitchen-checkout-page--done">/g,
  '<div className="kitchen-checkout-page kitchen-checkout-page--done">'
);
s = s.replace(
  /<motion className="kitchen-checkout-page kitchen-checkout-page--pay"> e\.stopPropagation\(\)}>/g,
  '<div className="kitchen-checkout-page kitchen-checkout-page--pay" onClick={(e) => e.stopPropagation()}>'
);
s = s.replace(
  /<div className="kitchen-checkout-page kitchen-checkout-page--pay"> e\.stopPropagation\(\)}>/g,
  '<motion className="kitchen-checkout-page kitchen-checkout-page--pay" onClick={(e) => e.stopPropagation()}>'
);
s = s.replace(
  /<motion className="kitchen-checkout-page kitchen-checkout-page--pay" onClick=\{\(e\) => e\.stopPropagation\(\)\}>/g,
  '<div className="kitchen-checkout-page kitchen-checkout-page--pay" onClick={(e) => e.stopPropagation()}>'
);

const D = 'di' + 'v';
const doneOverlay =
  `<${D} className="kitchen-checkout-page-overlay" role="dialog" aria-modal="true" aria-labelledby="kitchen-checkout-done-title">`;
const payOverlay =
  `<${D} className="kitchen-checkout-page-overlay" role="dialog" aria-modal="true" aria-labelledby="kitchen-checkout-pay-title" onClick={onClose}>`;
const guestOverlay =
  `<${D} className="kitchen-checkout-guest-overlay" role="dialog" aria-modal="true" aria-labelledby="kitchen-checkout-guest-title">`;

s = s.replace(`<${D} className="kitchen-checkout-page-overlay">`, doneOverlay, 1);
s = s.replace(`<${D} className="kitchen-checkout-guest-overlay">`, guestOverlay);
// pay overlay is second kitchen-checkout-page-overlay - actually done uses it first, pay uses at end
// After first replace, pay still has plain overlay - find pay return's overlay
const payIdx = s.lastIndexOf('return (\n    <' + D);
const overlayPlain = `<${D} className="kitchen-checkout-page-overlay">\n      <${D} className="kitchen-checkout-page kitchen-checkout-page--pay"`;
const overlayFixed = payOverlay + `\n      <${D} className="kitchen-checkout-page kitchen-checkout-page--pay"`;
if (s.includes(overlayPlain)) {
  s = s.replace(overlayPlain, overlayFixed);
}

s = s.replace(
  /\n  const handlePrintDetailOnly = [\s\S]*?\n  };\n\n  if \(!checkoutSlip/,
  '\n\n  if (!checkoutSlip'
);

fs.writeFileSync(p, s);
console.log('fixed onclick corruption');
