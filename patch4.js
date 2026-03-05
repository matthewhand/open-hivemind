const fs = require('fs');
const file = 'tests/routes/bots.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "mockManager.getBot.mockResolvedValue({ id: 'bot1', name: 'Bot 1' });",
  "// mockManager.getBot is used but apparently undefined in this block.\n    // Let's add it to the mock\n    mockManager.getBot = jest.fn().mockResolvedValue({ id: 'bot1', name: 'Bot 1' });"
);

fs.writeFileSync(file, code);
