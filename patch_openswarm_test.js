const fs = require('fs');

let testStr = fs.readFileSync('packages/llm-openswarm/src/OpenSwarmProvider.test.ts', 'utf8');

const target = `import { OpenSwarmProvider } from './index';`;
const insert = `import { OpenSwarmProvider } from './index';

jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return {
    ...actual,
    isSafeUrl: jest.fn().mockResolvedValue(true)
  };
});`;

if (!testStr.includes('jest.mock')) {
  testStr = testStr.replace(target, insert);
  fs.writeFileSync('packages/llm-openswarm/src/OpenSwarmProvider.test.ts', testStr);
}
