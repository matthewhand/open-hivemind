const fs = require('fs');

const testFile = 'tests/auth/AuthManager.security.test.ts';
let code = fs.readFileSync(testFile, 'utf8');

code = code.replace(/process\.env\.ADMIN_PASSWORD = 'mysecurepassword';\n    process\.env\.JWT_SECRET = 'test-secret';\n    process\.env\.JWT_REFRESH_SECRET = 'test-refresh-secret';\n    process\.env\.JWT_REFRESH_SECRET = 'test-refresh-secret';/g,
"process.env.ADMIN_PASSWORD = 'mysecurepassword';\n    process.env.JWT_SECRET = 'test-secret';\n    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';");

fs.writeFileSync(testFile, code);
