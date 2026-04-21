#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const { spawnSync } = require('child_process');

const LIST_PATH = 'tests/flaky-tests.txt';
const MAX_RETRIES = Number(process.env.FLAKY_TEST_RETRIES || 2);

if (!fs.existsSync(LIST_PATH)) {
  console.log(`${LIST_PATH} not found. Nothing to run.`);
  process.exit(0);
}

const tests = fs
  .readFileSync(LIST_PATH, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

if (tests.length === 0) {
  console.log('No flaky tests listed. Nothing to run.');
  process.exit(0);
}

const summary = [];
let failures = 0;

for (const testPath of tests) {
  let passed = false;
  let attempts = 0;
  for (let i = 0; i <= MAX_RETRIES; i += 1) {
    attempts += 1;
    console.log(`Running flaky test [${testPath}] attempt ${attempts}/${MAX_RETRIES + 1}`);
    const result = spawnSync(
      'node',
      [
        '-r',
        'dotenv/config',
        './node_modules/jest/bin/jest.js',
        testPath,
        '--runInBand',
        '--ci',
        '--testTimeout=30000',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, NODE_CONFIG_DIR: 'config/test', NODE_ENV: 'test' },
      }
    );
    if (result.status === 0) {
      passed = true;
      break;
    }
  }

  summary.push({ testPath, passed, attempts });
  if (!passed) failures += 1;
}

fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/flaky-test-summary.json', JSON.stringify(summary, null, 2));

console.log('Flaky test summary:');
for (const item of summary) {
  console.log(`- ${item.testPath}: ${item.passed ? 'PASS' : 'FAIL'} after ${item.attempts} attempt(s)`);
}

if (failures > 0) {
  console.error(`Flaky quarantine had ${failures} failing test(s).`);
  process.exit(1);
}
