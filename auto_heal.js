const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_ITERATIONS = 50;

function runHealer() {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        console.log(`\nIteration ${i + 1}...`);
        try {
            execSync('npx tsc --noEmit', { stdio: 'pipe' });
            console.log('SUCCESS! All files compile cleanly.');
            return;
        } catch (error) {
            const output = error.stdout?.toString() || error.message;
            const regex = /([^:]+)\((\d+),(\d+)\): error TS(1005|1003):/g;

            let match;
            const firstErrorPerFile = {};

            while ((match = regex.exec(output)) !== null) {
                const file = match[1];
                const line = parseInt(match[2], 10);
                if (!firstErrorPerFile[file]) {
                    firstErrorPerFile[file] = line;
                }
            }

            const filesToFix = Object.keys(firstErrorPerFile);
            if (filesToFix.length === 0) {
                console.log('No parse errors found, but tsc failed. Output:', output.substring(0, 500));
                return;
            }

            console.log(`Found parse errors in ${filesToFix.length} files. Patching...`);
            let patchedCount = 0;

            for (const file of filesToFix) {
                if (!fs.existsSync(file)) continue;
                const errorLineNum = firstErrorPerFile[file];
                const content = fs.readFileSync(file, 'utf8').split('\n');

                // Start from the error line and scan backwards to find `});` that we can turn into `}));`
                let patched = false;
                // In many cases errorLineNum is after the actual missing bracket (often EOF or export).
                // If it points exactly to a `);` it might be `);` -> `));`

                let startLine = Math.min(errorLineNum, content.length - 1);
                for (let j = startLine; j >= 0; j--) {
                    const lineTrimmed = content[j].trim();

                    if (lineTrimmed === '});') {
                        content[j] = content[j].replace('});', '}));');
                        patched = true;
                        break;
                    } else if (lineTrimmed === ');' && !content[j].includes('();')) {
                        content[j] = content[j].replace(');', '));');
                        patched = true;
                        break;
                    }
                }

                if (patched) {
                    fs.writeFileSync(file, content.join('\n'));
                    patchedCount++;
                } else {
                    console.log(`Failed to find patch target in ${file} stepping back from line ${errorLineNum}`);
                }
            }

            if (patchedCount === 0) {
                console.log('Made 0 patches. Exiting to prevent infinite loop.');
                return;
            }
        }
    }
    console.log('Reached max iterations.');
}

runHealer();
