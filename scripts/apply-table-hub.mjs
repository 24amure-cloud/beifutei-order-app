import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = 'di' + 'v';
const open = (extra = '') => '<' + D + extra + '>';
const close = '</' + D + '>';

function fixMotionTags(text) {
  return text.replace(/<\/?motion\b[^>]*>/g, (tag) => {
    if (tag.startsWith('</')) return close;
    const cls = tag.match(/className="[^"]+"/);
    return cls ? open(' ' + cls[0]) : open();
  });
}

const patchPath = path.join(root, 'scripts/table-hub-replacement.txt');
let replacement = fixMotionTags(fs.readFileSync(patchPath, 'utf8'));

const kitchenPath = path.join(root, 'src/KitchenApp.jsx');
let s = fs.readFileSync(kitchenPath, 'utf8');

const histStart = '                            <' + D + ' className="kitchen-table-status__history">';
const actionsStart = '                            <' + D + ' className="kitchen-table-status__actions">';
const slipStart =
  '\n                <section className="kitchen-orders kitchen-orders--in-hub kitchen-slip-ledger"';
const flowStart =
  '\n                <section className="kitchen-panel kitchen-panel--muted kitchen-flow-note">';

const startIdx = s.indexOf(histStart);
const actionsIdx = s.indexOf(actionsStart, startIdx);
const actionsEnd = s.indexOf(
  '                            </' + D + '>\n                          </article>',
  actionsIdx
);

if (startIdx < 0 || actionsIdx < 0 || actionsEnd < 0) {
  console.error('markers not found', { startIdx, actionsIdx, actionsEnd });
  process.exit(1);
}

let merged = s.slice(0, startIdx) + replacement + s.slice(actionsEnd);
const slipIdx = merged.indexOf(slipStart);
const flowIdx = merged.indexOf(flowStart, slipIdx);
if (slipIdx < 0 || flowIdx < 0) {
  console.error('slip section not found', { slipIdx, flowIdx });
  process.exit(1);
}
merged = merged.slice(0, slipIdx) + merged.slice(flowIdx);

fs.writeFileSync(kitchenPath, merged);
console.log('applied table hub merge');
