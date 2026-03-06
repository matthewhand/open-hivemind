const fs = require('fs');
const file = 'tests/routes/bots.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "it('GET /api/bots/:id/activity should return activity logs', async () => {",
  "it('GET /api/bots/:id/activity should return activity logs', async () => {\n    mockManager.getBot.mockResolvedValue({ id: 'bot1', name: 'Bot 1' });"
);

fs.writeFileSync(file, code);
