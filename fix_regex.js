const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find src/server/routes -type f -name "*.ts"').toString().trim().split('\n');

const regex1 = /asyncErrorHandler\(async \(([^)]+)\) => \{([\s\S]*?)^([ \t]*)\}\);/gm;
const regex2 = /asyncErrorHandler\(async \(([^)]+)\) => \{([\s\S]*?)^([ \t]*)\}\)\n([ \t]*)\);/gm;

let patchedCount = 0;
for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Clean up user's manual garbage '}));' on 'res.json({'
    content = content.replace(/^([ \t]+)\}\)\);/gm, '$1});');

    content = content.replace(regex1, 'asyncErrorHandler(async ($1) => {$2$3}));');
    content = content.replace(regex2, 'asyncErrorHandler(async ($1) => {$2$3}))\n$4);');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Regex patched ${file}`);
        patchedCount++;
    }
}

console.log(`Fully patched ${patchedCount} files.`);
