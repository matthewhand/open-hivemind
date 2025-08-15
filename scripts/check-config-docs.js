const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const docsPath = path.join(__dirname, '..', 'docs', 'config-reference.md');
const original = fs.readFileSync(docsPath, 'utf-8');

try {
  execSync('npm run -s docs:config', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to regenerate config docs:', e.message);
  process.exit(1);
}

const updated = fs.readFileSync(docsPath, 'utf-8');
if (original !== updated) {
  console.error('Config docs are out of date. Run: npm run docs:config');
  process.exit(2);
}

console.log('Config docs up to date.');

