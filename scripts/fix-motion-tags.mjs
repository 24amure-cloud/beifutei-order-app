import fs from 'fs';
import path from 'path';

const files = process.argv.slice(2);
const D = 'di' + 'v';

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/<\/?motion\b[^>]*>/g, (tag) => {
    if (tag.startsWith('</')) return '</' + D + '>';
    const cls = tag.match(/className="[^"]+"/);
    return cls ? '<' + D + ' ' + cls[0] + '>' : '<' + D + '>';
  });
  fs.writeFileSync(f, s);
  console.log('fixed', path.basename(f));
}
