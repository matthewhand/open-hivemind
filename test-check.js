const fs = require('fs');
const content = fs.readFileSync('src/plugins/PluginManager.ts', 'utf8');
console.log(content.includes("import { isSafeUrl }"));
