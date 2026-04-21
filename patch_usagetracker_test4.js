const fs = require('fs');

const testFile = 'tests/services/UsageTrackerService.test.ts';
let code = fs.readFileSync(testFile, 'utf8');

code = code.replace(/await new Promise\(resolve => process\.nextTick\(resolve\)\);/g, "await Promise.resolve();\n    await Promise.resolve();");

fs.writeFileSync(testFile, code);
