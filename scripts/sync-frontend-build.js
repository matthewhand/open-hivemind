#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'src/client/dist');
const publicDir = path.resolve(rootDir, 'public');

if (!fs.existsSync(distDir)) {
  console.error(`Frontend build output not found at ${distDir}. Run the Vite build before syncing.`);
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  console.error(`Public directory not found at ${publicDir}.`);
  process.exit(1);
}

const removeIfExists = (targetPath) => {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
};

// Remove stale directories that are no longer used
removeIfExists(path.join(publicDir, 'dist'));

// Copy fresh build artifacts into the public directory
for (const entry of fs.readdirSync(distDir)) {
  const srcPath = path.join(distDir, entry);
  const destPath = path.join(publicDir, entry);

  removeIfExists(destPath);
  const stats = fs.statSync(srcPath);

  if (stats.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.cpSync(srcPath, destPath);
  }
}

console.log('✅ Frontend build synced to public/.');
