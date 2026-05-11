const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.jsx');
let code = fs.readFileSync(appPath, 'utf-8');

// Replace all instances of `backgroundSize: 'cover'` with `backgroundSize: 'contain', backgroundRepeat: 'no-repeat'`
// If they already have `backgroundPosition: 'center'`, that's fine. If not, it's fine.
code = code.replace(/backgroundSize:\s*'cover'/g, "backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'");

// Clean up duplicate backgroundPosition if it existed before
code = code.replace(/backgroundPosition:\s*'center',\s*backgroundPosition:\s*'center'/g, "backgroundPosition: 'center'");

fs.writeFileSync(appPath, code, 'utf-8');
console.log('App.jsx updated successfully.');
