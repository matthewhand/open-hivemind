#!/usr/bin/env node
// scripts/sync-deps.js — detect shared dep version drift across workspace packages
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const rootDeps = { ...root.dependencies, ...root.devDependencies };

const pkgFiles = glob.sync('packages/*/package.json');
let drifted = false;

for (const pkgFile of pkgFiles) {
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(deps)) {
    if (rootDeps[name] && rootDeps[name] !== version) {
      console.warn(`DRIFT [${pkgFile}] ${name}: ${version} (root: ${rootDeps[name]})`);
      drifted = true;
    }
  }
}

if (drifted) {
  console.error('Dependency version drift detected. Align versions with root package.json.');
  process.exit(1);
} else {
  console.log('All shared dependencies are in sync.');
}
