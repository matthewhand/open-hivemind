const fs = require('fs');
let code = fs.readFileSync('src/client/src/pages/ExportPage.tsx', 'utf8');

let lines = code.split('\n');
let newLines = [];
let seen = new Set();
for (let line of lines) {
    if (line.includes('useSuccessToast')) {
        if (!seen.has('useSuccessToast')) {
            newLines.push(line);
            seen.add('useSuccessToast');
        } else if (!line.startsWith('import ')) {
            newLines.push(line);
        }
    } else {
        newLines.push(line);
    }
}

fs.writeFileSync('src/client/src/pages/ExportPage.tsx', newLines.join('\n'));
console.log('fixed export page');
