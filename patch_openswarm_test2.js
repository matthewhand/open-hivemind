const fs = require('fs');

let testStr = fs.readFileSync('packages/llm-openswarm/src/OpenSwarmProvider.test.ts', 'utf8');

const target = `jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return {
    ...actual,
    isSafeUrl: jest.fn().mockResolvedValue(true)
  };
});`;

const insert = `jest.mock('@hivemind/shared-types', () => ({
  ...jest.requireActual('@hivemind/shared-types'),
  isSafeUrl: jest.fn().mockResolvedValue(true)
}));`;

testStr = testStr.replace(target, insert);

if (!testStr.includes('jest.mock')) {
  testStr = `import { OpenSwarmProvider } from './index';

jest.mock('@hivemind/shared-types', () => ({
  isSafeUrl: jest.fn().mockResolvedValue(true)
}));

` + testStr.replace(/import \{ OpenSwarmProvider \} from '\.\/index';/, '');
}

fs.writeFileSync('packages/llm-openswarm/src/OpenSwarmProvider.test.ts', testStr);
