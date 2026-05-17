import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/receiptPrint.js');
let s = fs.readFileSync(p, 'utf8');
const D = 'di' + 'v';
s = s.replace(/<\/?motion\b[^>]*>/g, (tag) => (tag.startsWith('</') ? '</' + D + '>' : '<' + D + '>'));
fs.writeFileSync(p, s);
console.log('fixed receiptPrint tags');
