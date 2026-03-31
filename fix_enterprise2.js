const fs = require('fs');

const file = 'src/server/routes/enterprise.ts';
let content = fs.readFileSync(file, 'utf8');

// The replacement above added a trailing comma inside the method call like `ApiResponse.error(..., error: '...',)`
let regex = /ApiResponse\.error\(([^)]+),\)/g;
content = content.replace(regex, 'ApiResponse.error($1)');

fs.writeFileSync(file, content);
console.log('Processed enterprise 2');
