const fs = require('fs');
const file = 'tests/unit/services/ToolManager.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const resultPromise = mgr\.executeTool\('bot1', 'slow', \{\}\);\n\s*jest\.advanceTimersByTime\(30_001\);\n\n\s*const result = await resultPromise;/g,
  `const resultPromise = mgr.executeTool('bot1', 'slow', {});\n      await Promise.resolve(); // flush microtasks\n      jest.advanceTimersByTime(30_001);\n\n      const result = await resultPromise;`
);

fs.writeFileSync(file, content, 'utf8');
