/**
 * Example: Version Tracking and Update Detection
 *
 * This demonstrates how the version tracking system works in the Marketplace.
 */

import { compareVersions, isNewerVersion, checkForUpdates } from '../src/server/utils/versionTracking';

// ============================================================================
// Example 1: Version Comparison
// ============================================================================

console.log('=== Version Comparison Examples ===\n');

// Compare semantic versions
console.log('1.2.3 vs 1.2.4:', compareVersions('1.2.3', '1.2.4')); // -1 (older)
console.log('1.3.0 vs 1.2.9:', compareVersions('1.3.0', '1.2.9')); // 1 (newer)
console.log('2.0.0 vs 1.9.9:', compareVersions('2.0.0', '1.9.9')); // 1 (newer)
console.log('1.0.0 vs 1.0.0:', compareVersions('1.0.0', '1.0.0')); // 0 (equal)

// With 'v' prefix
console.log('v1.2.3 vs v1.2.4:', compareVersions('v1.2.3', 'v1.2.4')); // -1 (older)

console.log('\n');

// ============================================================================
// Example 2: Check if Update Available
// ============================================================================

console.log('=== Update Detection Examples ===\n');

console.log('Is 1.2.4 newer than 1.2.3?', isNewerVersion('1.2.3', '1.2.4')); // true
console.log('Is 1.2.3 newer than 1.2.4?', isNewerVersion('1.2.4', '1.2.3')); // false
console.log('Is 2.0.0 newer than 1.9.9?', isNewerVersion('1.9.9', '2.0.0')); // true

console.log('\n');

// ============================================================================
// Example 3: Check for Updates (with actual plugin)
// ============================================================================

async function demonstrateUpdateCheck() {
  console.log('=== Check for Updates Example ===\n');

  // Example: Check if a plugin has updates available
  // This would work if the plugin is actually installed

  const pluginPath = '/path/to/plugins/llm-example';
  const currentVersion = '1.2.3';
  const repoUrl = 'https://github.com/example/llm-example';

  try {
    const versionInfo = await checkForUpdates(pluginPath, currentVersion, repoUrl);

    console.log('Current version:', versionInfo.current);
    console.log('Latest version:', versionInfo.latest || 'unknown');
    console.log('Has update:', versionInfo.hasUpdate);

    if (versionInfo.hasUpdate && versionInfo.changelog) {
      console.log('\nChangelog:');
      versionInfo.changelog.forEach((entry, idx) => {
        console.log(`\n${idx + 1}. ${entry.message}`);
        console.log(`   Version: ${entry.version || 'N/A'}`);
        console.log(`   Date: ${new Date(entry.date).toLocaleDateString()}`);
        console.log(`   Author: ${entry.author || 'Unknown'}`);
        console.log(`   SHA: ${entry.sha || 'N/A'}`);
      });
    }
  } catch (error) {
    console.log('Could not check for updates:', error);
  }
}

// ============================================================================
// Example 4: Typical UI Flow
// ============================================================================

interface Package {
  name: string;
  version: string;
  latestVersion?: string;
  hasUpdate?: boolean;
}

function displayPackageWithUpdateBadge(pkg: Package) {
  console.log('\n=== Package Display Example ===\n');

  console.log(`Package: ${pkg.name}`);
  console.log(`Current Version: v${pkg.version}`);

  if (pkg.hasUpdate && pkg.latestVersion) {
    console.log(`Latest Version: v${pkg.latestVersion}`);
    console.log('Status: [UPDATE AVAILABLE] ⚠️');
    console.log('Action: Click to view changelog and update');
  } else {
    console.log('Status: [UP TO DATE] ✓');
  }
}

// Example packages
const packageWithUpdate: Package = {
  name: 'llm-openai',
  version: '1.2.3',
  latestVersion: '1.3.0',
  hasUpdate: true
};

const packageUpToDate: Package = {
  name: 'llm-anthropic',
  version: '2.0.0',
  latestVersion: '2.0.0',
  hasUpdate: false
};

displayPackageWithUpdateBadge(packageWithUpdate);
displayPackageWithUpdateBadge(packageUpToDate);

// ============================================================================
// Example 5: API Usage
// ============================================================================

console.log('\n=== API Endpoints Example ===\n');

console.log('GET /api/marketplace/packages');
console.log('Response:');
console.log(JSON.stringify([
  {
    name: 'llm-openai',
    displayName: 'OpenAI Provider',
    version: '1.2.3',
    latestVersion: '1.3.0',
    hasUpdate: true,
    status: 'installed',
    changelog: [
      {
        version: '1.3.0',
        date: '2026-03-20',
        message: 'Add support for GPT-4 Turbo',
        author: 'John Doe',
        sha: 'abc1234'
      }
    ]
  }
], null, 2));

console.log('\n\nGET /api/marketplace/check-updates/:name');
console.log('Response:');
console.log(JSON.stringify({
  name: 'llm-openai',
  current: '1.2.3',
  latest: '1.3.0',
  hasUpdate: true,
  changelog: [
    {
      version: '1.3.0',
      date: '2026-03-20',
      message: 'Add support for GPT-4 Turbo',
      author: 'John Doe',
      sha: 'abc1234'
    }
  ]
}, null, 2));

console.log('\n\nGET /api/marketplace/check-all-updates');
console.log('Response:');
console.log(JSON.stringify({
  total: 5,
  updatesAvailable: 2,
  packages: [
    { name: 'llm-openai', current: '1.2.3', latest: '1.3.0', hasUpdate: true },
    { name: 'llm-anthropic', current: '2.0.0', latest: '2.0.0', hasUpdate: false }
  ]
}, null, 2));

// Run the async example
// demonstrateUpdateCheck();
