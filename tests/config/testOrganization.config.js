/**
 * Test Organization Configuration
 * Defines clear separation between unit, integration, and e2e tests
 */

const path = require('path');

module.exports = {
  // Unit Tests - Fast, isolated, mock-heavy
  unit: {
    displayName: 'unit',
    roots: ['<rootDir>/tests'],
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/tests/unit/**/*.test.ts',
      '<rootDir>/tests/utils/**/*.test.ts',
      '<rootDir>/tests/config/**/*.test.ts',
      '<rootDir>/tests/helpers/**/*.test.ts'
    ],
    testPathIgnorePatterns: [
      '<rootDir>/tests/integration/',
      '<rootDir>/tests/e2e/',
      '<rootDir>/tests/examples/',
      '<rootDir>/node_modules/'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/client/**', // Covered by frontend tests
      '!src/server/server.ts', // Covered by integration tests
      '!src/database/**', // Covered by integration tests
    ],
    coverageDirectory: '<rootDir>/coverage/unit',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
      global: {
        statements: 80,
        branches: 70,
        functions: 75,
        lines: 80
      }
    },
    testTimeout: 5000
  },

  // Integration Tests - Real dependencies, API flows
  integration: {
    displayName: 'integration',
    roots: ['<rootDir>/tests'],
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/tests/integration/**/*.test.ts'
    ],
    testPathIgnorePatterns: [
      '<rootDir>/tests/unit/',
      '<rootDir>/tests/e2e/',
      '<rootDir>/tests/examples/',
      '<rootDir>/node_modules/'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/integration.setup.ts'],
    collectCoverageFrom: [
      'src/server/**/*.ts',
      'src/database/**/*.ts',
      'src/integrations/**/*.ts',
      '!src/**/*.d.ts'
    ],
    coverageDirectory: '<rootDir>/coverage/integration',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000, // Longer timeout for integration tests
    // Run integration tests sequentially to avoid conflicts
    maxWorkers: 1,
    detectOpenHandles: true
  },

  // End-to-End Tests - Full application flows
  e2e: {
    displayName: 'e2e',
    roots: ['<rootDir>/tests'],
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/tests/e2e/**/*.test.ts'
    ],
    testPathIgnorePatterns: [
      '<rootDir>/tests/unit/',
      '<rootDir>/tests/integration/',
      '<rootDir>/tests/examples/',
      '<rootDir>/node_modules/'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/e2e.setup.ts'],
    globalSetup: '<rootDir>/tests/e2e.globalSetup.ts',
    globalTeardown: '<rootDir>/tests/e2e.globalTeardown.ts',
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts'
    ],
    coverageDirectory: '<rootDir>/coverage/e2e',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 60000, // Longer timeout for e2e tests
    maxWorkers: 1, // Run e2e tests sequentially
    detectOpenHandles: true,
    forceExit: true
  },

  // Performance Tests - Specialized performance validation
  performance: {
    displayName: 'performance',
    roots: ['<rootDir>/tests'],
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/tests/**/*.performance.test.ts',
      '<rootDir>/tests/performance/**/*.test.ts'
    ],
    testPathIgnorePatterns: [
      '<rootDir>/node_modules/'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/performance.setup.ts'],
    collectCoverage: false, // Performance tests don't need coverage
    testTimeout: 120000, // 2 minutes for performance tests
    maxWorkers: 1,
    detectOpenHandles: true
  },

  // Examples and Documentation Tests
  examples: {
    displayName: 'examples',
    roots: ['<rootDir>/tests'],
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/tests/examples/**/*.test.ts'
    ],
    testPathIgnorePatterns: [
      '<rootDir>/node_modules/'
    ],
    collectCoverage: false, // Example tests are for documentation
    testTimeout: 10000
  }
};

/**
 * Helper function to get test configuration by type
 */
function getTestConfig(type = 'unit') {
  const config = module.exports[type];
  if (!config) {
    throw new Error(`Unknown test type: ${type}. Available types: ${Object.keys(module.exports).join(', ')}`);
  }
  return config;
}

/**
 * Helper to run specific test types
 */
function runTestType(type) {
  const config = getTestConfig(type);
  console.log(`Running ${type} tests with configuration:`, config.displayName);
  return config;
}

module.exports.getTestConfig = getTestConfig;
module.exports.runTestType = runTestType;