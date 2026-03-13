const fs = require('fs');
let index = fs.readFileSync('src/plugins/index.ts', 'utf8');
index = index.replace(', manifest', '');
fs.writeFileSync('src/plugins/index.ts', index);
