export default {
  rootDir: __dirname,
  // Use jsdom environment for DOM testing
  testEnvironment: 'jsdom',

  // Transform TypeScript and JSX files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@store/(.*)$': '<rootDir>/store/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@styles/(.*)$': '<rootDir>/styles/$1',
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],

  // Test match patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/**/*.(test|spec).(ts|tsx|js)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.(ts|tsx)',
    '!**/*.d.ts',
    '!main.tsx',
    '!vite-env.d.ts',
    '!setupTests.ts',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Coverage thresholds (initial setup - can be increased as more tests are added)
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Transform ignore patterns for ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(react-dnd|react-dnd-html5-backend|@react-dnd|dnd-core)/)',
  ],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,
};
