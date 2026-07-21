const { readFileSync } = require('fs');
const content = readFileSync('src/client/src/components/Dashboard.tsx', 'utf8');
const lines = content.split('\n').filter(line => line.includes('import'));
console.log(lines.join('\n'));
