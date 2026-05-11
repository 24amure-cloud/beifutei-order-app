const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'index.css');
let cssCode = fs.readFileSync(cssPath, 'utf-8');

// ABURASOBA fixes
cssCode = cssCode.replace(
  /(\.abu-hero-img\s*\{[^}]*)border-radius:\s*50%;\s*box-shadow:\s*[^;]+;\s*background-color:\s*white;/g,
  '$1background-color: transparent;'
);

cssCode = cssCode.replace(
  /(\.abu-rec-img\s*\{[^}]*)background-color:\s*#f5f5f5;\s*border-radius:\s*50%;/g,
  '$1background-color: transparent;'
);

cssCode = cssCode.replace(
  /(\.abu-topping-img\s*\{[^}]*)background-color:\s*#333;\s*border-radius:\s*50%;/g,
  '$1background-color: transparent;'
);

// SIDE DISH fixes
cssCode = cssCode.replace(
  /(\.sd-image-large\s*\{[^}]*)border-radius:\s*16px;\s*[\s\S]*?background-color:\s*#eee;\s*box-shadow:\s*[^;]+;/g,
  '$1background-color: transparent;'
);

cssCode = cssCode.replace(
  /(\.sd-image-round\s*\{[^}]*)border-radius:\s*50%;\s*[\s\S]*?background-color:\s*#eee;\s*box-shadow:\s*[^;]+;/g,
  '$1background-color: transparent;'
);

cssCode = cssCode.replace(
  /(\.sd-image-medium\s*\{[^}]*)border-radius:\s*50%;\s*[\s\S]*?background-color:\s*#eee;\s*box-shadow:\s*[^;]+;/g,
  '$1background-color: transparent;'
);

fs.writeFileSync(cssPath, cssCode, 'utf-8');
console.log("CSS updated for transparent background.");
