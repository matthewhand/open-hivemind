const fs = require('fs');
const file = 'tests/api/bots.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "errorCount: 0,",
  "// errorCount: 0,"
);

code = code.replace(
  "id: 'bot1',",
  "id: 'bot1',\n          messageProvider: 'discord',\n          provider: 'discord',\n          status: 'active',"
);

fs.writeFileSync(file, code);
