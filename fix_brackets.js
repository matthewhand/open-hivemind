const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find src/server/routes -type f -name "*.ts"').toString().trim().split('\n');

let patchedCount = 0;

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    let idx = 0;
    while (true) {
        idx = content.indexOf('asyncErrorHandler(', idx);
        if (idx === -1) break;

        let originalIdx = idx;

        let pCount = 0;
        let bCount = 0;
        let inArrowBody = false;

        let i = idx;
        while (i < content.length && content[i] !== '(') {
            i++;
        }

        for (; i < content.length; i++) {
            const char = content[i];

            if (char === '(') pCount++;
            else if (char === ')') pCount--;
            else if (char === '{') {
                bCount++;
                inArrowBody = true;
            } else if (char === '}') {
                bCount--;
            }

            if (char === "'" || char === '"' || char === '`') {
                const quote = char;
                i++;
                while (i < content.length) {
                    if (content[i] === '\\') i += 2;
                    else if (content[i] === quote) break;
                    else i++;
                }
            }
            if (char === '/' && content[i + 1] === '/') {
                while (i < content.length && content[i] !== '\n') i++;
            }
            if (char === '/' && content[i + 1] === '*') {
                while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) i++;
                i++;
            }

            if (inArrowBody && bCount === 0 && pCount === 1) {
                let injectionIndex = i + 1;
                let nextNonSpace = injectionIndex;

                let closeParens = 0;
                let temp = nextNonSpace;
                while (temp < content.length && (content[temp] === ')' || content[temp] === ';' || /\s/.test(content[temp]))) {
                    if (content[temp] === ')') closeParens++;
                    if (content[temp] === ';') break;
                    temp++;
                }

                if (closeParens < 2) {
                    content = content.substring(0, injectionIndex) + ')' + content.substring(injectionIndex);
                    idx = injectionIndex + 1;
                } else {
                    idx = i + 1;
                }
                break;
            }
        }

        if (idx === originalIdx) {
            idx += 'asyncErrorHandler('.length;
        }
    }

    if (content !== original) {
        console.log(`Patched ${file}`);
        fs.writeFileSync(file, content);
        patchedCount++;
    }
}

console.log(`Fully patched ${patchedCount} files.`);
