const fs = require('fs');

let testStr = fs.readFileSync('packages/llm-openswarm/src/OpenSwarmProvider.test.ts', 'utf8');

const target = `import { create, manifest } from './index';`;
const insert = `import { create, manifest } from './index';

jest.mock('@hivemind/shared-types', () => {
  return {
    ...jest.requireActual('@hivemind/shared-types'),
    isSafeUrl: jest.fn().mockResolvedValue(true)
  };
});`;

if (!testStr.includes('jest.mock(\'@hivemind/shared-types')) {
  testStr = testStr.replace(target, insert);
  fs.writeFileSync('packages/llm-openswarm/src/OpenSwarmProvider.test.ts', testStr);
}
