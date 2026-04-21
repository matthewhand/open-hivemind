const fs = require('fs');

const testFile = 'tests/auth/AuthManager.security.test.ts';
let code = fs.readFileSync(testFile, 'utf8');

// Replace the string
code = code.replace(/CRITICAL: ADMIN_PASSWORD environment variable is required in production./g, 'CRITICAL: JWT_SECRET environment variable is required in production.');
code = code.replace(/delete process.env.ADMIN_PASSWORD;/g, 'delete process.env.JWT_SECRET;\n    delete process.env.ADMIN_PASSWORD;');

fs.writeFileSync(testFile, code);
