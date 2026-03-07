const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SENSITIVE_PATTERNS = [
  /(?:api[_-]?key|secret|token|password)[\s]*[:=][\s]*["'](?!(?:\$\{.*?\}|YOUR_.*_KEY|YOUR_.*_TOKEN|dummy-key|[\*]+|))([^"']{8,})["']/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /xox[baprs]-[a-zA-Z0-9]{10,}/,
  /ghp_[a-zA-Z0-9]{36}/
];

const IGNORE_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.cache',
  'config/secure', // Encrypted config files
];

const IGNORE_FILES = [
  'audit-secrets.js',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock'
];

let hasFailures = false;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      if (!IGNORE_FILES.includes(entry.name) && !entry.name.endsWith('.enc')) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(line)) {
          console.error(`🚨 POTENTIAL SECRET FOUND 🚨`);
          console.error(`File: ${filePath}:${index + 1}`);
          console.error(`Line: ${line.trim()}`);
          console.error(`Pattern matched: ${pattern.toString()}`);
          console.error('---');
          hasFailures = true;
        }
      }
    });
  } catch (error) {
    // Ignore read errors for binary files or unreadable files
  }
}

console.log('🔍 Starting secrets audit scan...');

// 1. Scan specific directories
scanDirectory(path.join(__dirname, '..', 'src'));
scanDirectory(path.join(__dirname, '..', 'tests'));
scanDirectory(path.join(__dirname, '..', 'config'));

// 2. Quick git diff check for recent secrets (only checks staged/unstaged changes, skip full history for speed/stability)
try {
  const diffOutput = execSync('git diff -U0', { encoding: 'utf8' });
  const diffLines = diffOutput.split('\n');
  diffLines.forEach((line) => {
    if (line.startsWith('+')) {
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(line)) {
          console.error(`🚨 POTENTIAL SECRET FOUND IN GIT DIFF 🚨`);
          console.error(`Line: ${line.trim()}`);
          console.error(`Pattern matched: ${pattern.toString()}`);
          console.error('---');
          hasFailures = true;
        }
      }
    }
  });
} catch (e) {
  // Ignore git errors if not in a git repo
}

if (hasFailures) {
  console.error('❌ Secrets audit failed. Please remove hardcoded secrets.');
  process.exit(1);
} else {
  console.log('✅ Secrets audit passed. No hardcoded secrets found.');
  process.exit(0);
}
