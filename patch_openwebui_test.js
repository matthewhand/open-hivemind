const fs = require('fs');

let testStr = fs.readFileSync('packages/llm-openwebui/src/openWebUIProvider.test.ts', 'utf8');

const target = `import { create, manifest } from './index';`;
const insert = `import { create, manifest } from './index';

jest.mock('@hivemind/shared-types', () => ({
  ...jest.requireActual('@hivemind/shared-types'),
  isSafeUrl: jest.fn().mockResolvedValue(true)
}));`;

if (!testStr.includes('jest.mock(\'@hivemind/shared-types')) {
  testStr = testStr.replace(target, insert);
  fs.writeFileSync('packages/llm-openwebui/src/openWebUIProvider.test.ts', testStr);
}
