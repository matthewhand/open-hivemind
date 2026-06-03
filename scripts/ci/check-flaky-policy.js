#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');

const LIST_PATH = 'tests/flaky-tests.txt';

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
  console.log(`${LIST_PATH} not found. Policy check skipped.`);
  process.exit(0);
}

const lines = fs
  .readFileSync(LIST_PATH, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

if (lines.length === 0) {
  console.log('No flaky entries found. Policy check passed.');
  process.exit(0);
}

const todayIso = new Date().toISOString().slice(0, 10);
let violations = 0;

for (const line of lines) {
  const entry = parseEntry(line);
  if (!entry.testPath) {
    console.error(`Invalid flaky entry: ${line}`);
    violations += 1;
    continue;
  }
  if (!entry.owner) {
    console.error(`Missing owner for flaky entry: ${entry.testPath}`);
    violations += 1;
  }
  if (!entry.expires || !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) {
    console.error(`Missing/invalid expires (YYYY-MM-DD) for flaky entry: ${entry.testPath}`);
    violations += 1;
    continue;
  }
  if (entry.expires < todayIso) {
    console.error(
      `Expired flaky entry: ${entry.testPath} (owner=${entry.owner || 'unknown'}, expires=${entry.expires})`
    );
    violations += 1;
  }
}

if (violations > 0) {
  console.error(`Flaky policy check failed with ${violations} violation(s).`);
  process.exit(1);
}

console.log('Flaky policy check passed.');
