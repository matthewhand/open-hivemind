const fs = require('fs');

const testFile = 'tests/services/UsageTrackerService.test.ts';
let code = fs.readFileSync(testFile, 'utf8');

code = code.replace(/await new Promise\(resolve => process\.nextTick\(resolve\)\);\n    await new Promise\(resolve => process\.nextTick\(resolve\)\);/g, "await new Promise(resolve => process.nextTick(resolve));");

fs.writeFileSync(testFile, code);
