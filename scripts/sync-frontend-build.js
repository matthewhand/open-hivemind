#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../src/client/dist');
const publicDir = path.resolve(__dirname, '../public');

const requiredPaths = ['index.html', 'vite.svg'];
const optionalPaths = ['manifest.webmanifest', 'robots.txt'];

const copyFile = (source, destination) => {
  if (!fs.existsSync(source)) {
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};

const copyDirectory = (source, destination) => {
  if (!fs.existsSync(source)) {
    return;
  }
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
};

if (!fs.existsSync(distDir)) {
  console.error('Frontend build not found at', distDir);
  process.exit(1);
}

copyDirectory(path.join(distDir, 'assets'), path.join(publicDir, 'assets'));
copyDirectory(path.join(distDir, 'dist'), path.join(publicDir, 'dist'));

[...requiredPaths, ...optionalPaths].forEach((fileName) => {
  copyFile(path.join(distDir, fileName), path.join(publicDir, fileName));
});

console.log('✅ Frontend assets synchronized to public/');
