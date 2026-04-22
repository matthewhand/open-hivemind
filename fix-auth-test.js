const fs = require('fs');
const file = 'tests/auth/AuthManager.security.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("process.env.NODE_ENV = 'production';", "process.env.NODE_ENV = 'production';\n    process.env.JWT_SECRET = 'dummy-secret';\n    process.env.JWT_REFRESH_SECRET = 'dummy-refresh-secret';");

fs.writeFileSync(file, content);
