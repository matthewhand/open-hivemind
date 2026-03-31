const fs = require('fs');

const file = 'src/server/routes/enterprise.ts';
let content = fs.readFileSync(file, 'utf8');

// Some return `res.json({ ... })` missing `.status(...)`. We should wrap these in `ApiResponse.success({ ... })` as well.
// Example:
// return res.json({
//   success: true,
//   data: ...
// });

let regex = /return res\.json\(\s*\{([\s\S]*?)\}\s*\);/g;

content = content.replace(regex, (match, inner) => {
    let cleanInner = inner.replace(/(?:^|[\n\s,])success\s*:\s*(true|false)\s*,?/g, '');
    cleanInner = cleanInner.trim();
    if (cleanInner.startsWith(',')) cleanInner = cleanInner.substring(1).trim();
    if (cleanInner.endsWith(',')) cleanInner = cleanInner.substring(0, cleanInner.length - 1).trim();

    if (cleanInner === '') {
         return `return res.json(ApiResponse.success());`;
    }
    return `return res.json(ApiResponse.success({${cleanInner}}));`;
});

fs.writeFileSync(file, content);
console.log('Processed enterprise 3');
