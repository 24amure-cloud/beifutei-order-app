import fs from 'fs';

const p = new URL('../src/KitchenApp.jsx', import.meta.url);
const D = 'di' + 'v';
let s = fs.readFileSync(p, 'utf8');
const dup =
  '                            </' +
  D +
  '>\n                            </' +
  D +
  '>\n                          </article>';
const fixed =
  '                            </' + D + '>\n                          </article>';
if (!s.includes(dup)) {
  console.error('dup pattern not found');
  process.exit(1);
}
s = s.replace(dup, fixed);
fs.writeFileSync(p, s);
console.log('removed duplicate closing tag');
