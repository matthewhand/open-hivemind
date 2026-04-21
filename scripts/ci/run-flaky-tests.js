#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const { spawnSync } = require('child_process');

const LIST_PATH = 'tests/flaky-tests.txt';
const MAX_RETRIES = Number(process.env.FLAKY_TEST_RETRIES || 2);

function parseEntry(line) {
  const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
  const testPath = parts[0] || '';
  const metadata = {};
  for (const part of parts.slice(1)) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    metadata[key] = value;
  }
  return {
    testPath,
    owner: metadata.owner || '',
    expires: metadata.expires || '',
    reason: metadata.reason || '',
  };
}

if (!fs.existsSync(LIST_PATH)) {
  console.log(`${LIST_PATH} not found. Nothing to run.`);
  process.exit(0);
}

const entries = fs
  .readFileSync(LIST_PATH, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map(parseEntry)
  .filter((entry) => entry.testPath);

if (entries.length === 0) {
  console.log('No flaky tests listed. Nothing to run.');
  process.exit(0);
}

const summary = [];
let failures = 0;

for (const entry of entries) {
  const testPath = entry.testPath;
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

  summary.push({
    testPath,
    owner: entry.owner,
    expires: entry.expires,
    reason: entry.reason,
    passed,
    attempts,
  });
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
