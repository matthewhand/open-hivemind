module.exports = {
  roots: ['<rootDir>/tests/real'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.js$': 'babel-jest'
  },
  testRegex: '(\\.|/)(real\\.test)\\.[tj]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapping: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@integrations/(.*)$': '<rootDir>/src/integrations/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/real.setup.ts'],
  verbose: true,
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/tests/unit/", "/tests/integration/"],
  testTimeout: 30000
};