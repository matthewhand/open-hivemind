const fs = require('fs');

const testFile = 'tests/auth/AuthManager.security.test.ts';
let code = fs.readFileSync(testFile, 'utf8');

// Also update the first test to set JWT_REFRESH_SECRET
code = code.replace(/process\.env\.JWT_SECRET = 'test-secret';/g, "process.env.JWT_SECRET = 'test-secret';\n    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';");

fs.writeFileSync(testFile, code);
