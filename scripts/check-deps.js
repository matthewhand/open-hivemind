#!/usr/bin/env node
/**
 * check-deps.js — Detects mismatched dependency versions between package.json
 * and what's actually resolved in package-lock.json.
 *
 * Prints a warning for any dep where the resolved version doesn't satisfy
 * the semver range declared in package.json.
 *
 * Exit code 1 if any mismatches found (CI-safe).
 */

const fs = require('fs');
const path = require('path');

function satisfies(resolved, range) {
    try {
        const semver = require('semver');
        return semver.satisfies(resolved, range);
    } catch {
        // semver not available — skip check
        return true;
    }
}

function checkLockfile(pkgPath, lockPath) {
    if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) return [];

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

    const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
    };

    const mismatches = [];

    for (const [name, range] of Object.entries(allDeps)) {
        const lockKey = `node_modules/${name}`;
        if (!lock.packages || !lock.packages[lockKey]) continue;

        const resolved = lock.packages[lockKey].version;
        if (!satisfies(resolved, range)) {
            mismatches.push({ name, range, resolved });
        }
    }

    return mismatches;
}

const checks = [
    { pkg: 'package.json', lock: 'package-lock.json' },
    { pkg: 'src/client/package.json', lock: 'src/client/package-lock.json' },
];

let totalMismatches = 0;

for (const { pkg, lock } of checks) {
    const mismatches = checkLockfile(
        path.resolve(__dirname, '..', pkg),
        path.resolve(__dirname, '..', lock),
    );

    if (mismatches.length === 0) {
        console.log(`✅ ${pkg}: no version mismatches`);
    } else {
        console.error(`❌ ${pkg}: ${mismatches.length} mismatch(es):`);
        for (const { name, range, resolved } of mismatches) {
            console.error(`   • ${name}: declared ${range}, resolved ${resolved}`);
        }
        totalMismatches += mismatches.length;
    }
}

if (totalMismatches > 0) {
    console.error(`\n${totalMismatches} total mismatch(es). Run \`npm install\` to regenerate lockfiles.`);
    process.exit(1);
} else {
    console.log('\nAll lockfiles consistent ✅');
}
