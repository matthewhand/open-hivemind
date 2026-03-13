#!/usr/bin/env node

const { spawn } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const install = spawn(npmCommand, ['install'], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

install.on('close', (code) => {
  process.exit(code ?? 0);
});

install.on('error', (error) => {
  console.error('Failed to run npm install:', error);
  process.exit(1);
});
