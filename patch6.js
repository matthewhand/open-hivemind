const fs = require('fs');
const file = 'tests/routes/dashboard.ai.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\/api\/dashboard\/api\/ai/g, "/api/dashboard/ai");

fs.writeFileSync(file, code);
