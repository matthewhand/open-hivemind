module.exports = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["html", "text", "lcov"],

  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/src/.*|(\\.|/)test)\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/',
    '^@command/(.*)$': '<rootDir>/src/command/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@llm/(.*)$': '<rootDir>/src/llm/$1',
    '^@message/(.*)$': '<rootDir>/src/message/$1',
    '^@webhook/(.*)$': '<rootDir>/src/webhook/$1',
    '^@integrations/(.*)$': '<rootDir>/src/integrations/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  setupFiles: ['module-alias/register'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  verbose: true,
};
