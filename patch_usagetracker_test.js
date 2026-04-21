const fs = require('fs');

const testFile = 'tests/services/UsageTrackerService.test.ts';
let code = fs.readFileSync(testFile, 'utf8');

code = code.replace(/await new Promise\(resolve => setTimeout\(resolve, 50\)\);/g, "await new Promise(resolve => process.nextTick(resolve));\n    await new Promise(resolve => setTimeout(resolve, 50));");

fs.writeFileSync(testFile, code);
