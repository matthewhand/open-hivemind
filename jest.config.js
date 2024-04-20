// jest.config.js

module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/testSetup.js'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1'
    },
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: [
      '<rootDir>/src/**/*.js',
      '!<rootDir>/src/main/**',
      '!<rootDir>/src/tmp/**'
    ],
    testPathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/dist/'
    ],
    verbose: true
  };
  