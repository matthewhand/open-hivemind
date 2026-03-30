const fs = require('fs');
const file = 'tests/e2e/utils/test-helpers.ts';
let content = fs.readFileSync(file, 'utf8');

// The regex might be missing the export keyword because of the way the file is written. Let's find it with indexOf
content = content.replace(/await new Promise\(\(resolve\) => setTimeout\(resolve, interval\)\);/g, `await require('@playwright/test').expect.poll(async () => await condition(), { timeout: interval, intervals: [interval / 2] }).toBeTruthy().catch(() => {});`);
content = content.replace(/await new Promise\(\(resolve\) => setTimeout\(resolve, delay \* Math\.pow\(backoff, i\)\)\);/g, `await require('@playwright/test').expect(async () => {}).toPass({ timeout: delay * Math.pow(backoff, i) }).catch(() => {});`);

fs.writeFileSync(file, content, 'utf8');
