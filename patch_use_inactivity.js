const fs = require('fs');

const hookTestFile = 'src/client/src/hooks/__tests__/useInactivity.test.ts';
let code = fs.readFileSync(hookTestFile, 'utf8');

code = code.replace(/act\(\(\) => \{ vi\.advanceTimersByTime\((.*?)\);\n/g, "act(() => { vi.advanceTimersByTime($1); });\n");
code = code.replace(/act\(\(\) => \{ window\.dispatchEvent\((.*?)\);\n/g, "act(() => { window.dispatchEvent($1); });\n");

fs.writeFileSync(hookTestFile, code);
