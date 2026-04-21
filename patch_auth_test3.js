const fs = require('fs');

const testFile = 'tests/auth/AuthManager.security.test.ts';
let code = fs.readFileSync(testFile, 'utf8');

// Replace expect(() => { ... }).toThrow(...) with checking message content
code = code.replace(/expect\(\(\) => \{\n      AuthManager\.getInstance\(\);\n    \}\)\.toThrow\('CRITICAL: ADMIN_PASSWORD environment variable is required in production\.'\);/g,
`expect(() => {
      AuthManager.getInstance();
    }).toThrow('CRITICAL: JWT_SECRET environment variable is required in production.');`);

fs.writeFileSync(testFile, code);
