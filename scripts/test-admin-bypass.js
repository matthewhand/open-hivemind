#!/usr/bin/env node

/**
 * Admin Bypass Test Runner
 *
 * This script runs comprehensive tests for the localhost admin authentication bypass feature.
 * It includes unit tests, integration tests, and end-to-end tests.
 */

const { spawn } = require('child_process');
const path = require('path');

const TEST_CATEGORIES = {
  unit: 'Unit Tests - Core functionality and edge cases',
  integration: 'Integration Tests - API interactions and flows',
  e2e: 'End-to-End Tests - Browser automation scenarios',
  all: 'All Tests - Complete test suite'
};

const testFiles = {
  unit: [
    'tests/unit/server/auth/localhost-bypass.test.ts'
  ],
  integration: [
    'tests/integration/auth/localhost-bypass-integration.test.ts'
  ],
  e2e: [
    'tests/e2e/admin-bypass-flow.test.ts'
  ]
};

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Running: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function setTestEnvironment(category) {
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.NODE_CONFIG_DIR = 'config/test';

  console.log('\n📋 Test Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   NODE_CONFIG_DIR: ${process.env.NODE_CONFIG_DIR}`);
  console.log(`   Test Category: ${category}`);
}

async function runUnitTests() {
  console.log('\n🧪 Running Unit Tests');
  console.log('='.repeat(50));

  for (const testFile of testFiles.unit) {
    console.log(`\n📄 Testing: ${testFile}`);
    try {
      await runCommand('npx', ['jest', testFile, '--verbose', '--runInBand'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log('✅ Unit tests passed');
    } catch (error) {
      console.error(`❌ Unit tests failed: ${error.message}`);
      throw error;
    }
  }
}

async function runIntegrationTests() {
  console.log('\n🔗 Running Integration Tests');
  console.log('='.repeat(50));

  // Ensure server is running for integration tests
  console.log('\n🚀 Starting test server...');

  try {
    for (const testFile of testFiles.integration) {
      console.log(`\n📄 Testing: ${testFile}`);
      await runCommand('npx', ['jest', testFile, '--verbose', '--runInBand'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log('✅ Integration tests passed');
    }
  } catch (error) {
    console.error(`❌ Integration tests failed: ${error.message}`);
    throw error;
  }
}

async function runE2ETests() {
  console.log('\n🌐 Running End-to-End Tests');
  console.log('='.repeat(50));

  // Check if puppeteer is available
  try {
    await runCommand('npx', ['puppeteer', '--version']);
  } catch (error) {
    console.log('⚠️  Puppeteer not found, skipping E2E tests');
    console.log('   To run E2E tests, install puppeteer: npm install --save-dev puppeteer');
    return;
  }

  try {
    for (const testFile of testFiles.e2e) {
      console.log(`\n📄 Testing: ${testFile}`);
      await runCommand('npx', ['jest', testFile, '--verbose', '--runInBand'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log('✅ E2E tests passed');
    }
  } catch (error) {
    console.error(`❌ E2E tests failed: ${error.message}`);
    throw error;
  }
}

async function runCoverageReport() {
  console.log('\n📊 Generating Coverage Report');
  console.log('='.repeat(50));

  try {
    await runCommand('npx', ['jest', [
      ...testFiles.unit,
      ...testFiles.integration
    ], '--coverage', '--coverageReporters=text', '--coverageReporters=html'], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    console.log('✅ Coverage report generated');
    console.log('📁 HTML coverage report available in: coverage/lcov-report/index.html');
  } catch (error) {
    console.error(`❌ Coverage generation failed: ${error.message}`);
  }
}

function printUsage() {
  console.log('\n🔐 Admin Bypass Test Runner');
  console.log('='.repeat(30));
  console.log('\nUsage: node scripts/test-admin-bypass.js [category]\n');

  Object.entries(TEST_CATEGORIES).forEach(([key, description]) => {
    console.log(`${key.padEnd(12)} - ${description}`);
  });

  console.log('\nExamples:');
  console.log('  node scripts/test-admin-bypass.js unit');
  console.log('  node scripts/test-admin-bypass.js integration');
  console.log('  node scripts/test-admin-bypass.js e2e');
  console.log('  node scripts/test-admin-bypass.js all');
  console.log('  node scripts/test-admin-bypass.js --coverage');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  const category = args[0];
  const includeCoverage = args.includes('--coverage');

  if (!TEST_CATEGORIES[category] && category !== '--coverage') {
    console.error(`❌ Unknown test category: ${category}`);
    printUsage();
    process.exit(1);
  }

  console.log('🔐 Localhost Admin Authentication Bypass Test Suite');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    setTestEnvironment(category);

    switch (category) {
      case 'unit':
        await runUnitTests();
        break;
      case 'integration':
        await runIntegrationTests();
        break;
      case 'e2e':
        await runE2ETests();
        break;
      case 'all':
        await runUnitTests();
        await runIntegrationTests();
        await runE2ETests();
        break;
    }

    if (includeCoverage || category === '--coverage') {
      await runCoverageReport();
    }

    const duration = Date.now() - startTime;
    console.log('\n🎉 All tests completed successfully!');
    console.log(`⏱️  Total duration: ${Math.round(duration / 1000)}s`);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n💥 Test suite failed after ${Math.round(duration / 1000)}s`);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  runCoverageReport
};