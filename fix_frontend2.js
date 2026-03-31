const fs = require('fs');
let code = fs.readFileSync('src/client/src/pages/SitemapPage.tsx', 'utf8');

let lines = code.split('\n');
let newLines = [];
let seen = new Set();
for (let line of lines) {
    if (line.includes('Button')) {
        if (!seen.has('Button')) {
            newLines.push(line);
            seen.add('Button');
        } else if (!line.startsWith('import ')) {
            newLines.push(line);
        }
    } else {
        newLines.push(line);
    }
}

fs.writeFileSync('src/client/src/pages/SitemapPage.tsx', newLines.join('\n'));
console.log('fixed sitemap page');
