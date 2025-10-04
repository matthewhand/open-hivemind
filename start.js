#!/usr/bin/env node

const { spawn } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const child = spawn(npmCommand, ['run', 'dev'], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

const close = () => {
  if (!child.killed) {
    child.kill('SIGINT');
  }
};

process.on('SIGINT', close);
process.on('SIGTERM', close);
process.on('exit', close);

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to run npm run dev:', error);
  process.exit(1);
});
