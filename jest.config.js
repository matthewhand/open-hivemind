module.exports = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["html", "text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 61,
      functions: 69,
      lines: 73,
      statements: 72,
    },
  },

  roots: ['<rootDir>/tests'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.tsx?$': 'babel-jest',
    '^.+\.jsx?$': 'babel-jest',
    '^.+\.js$': 'babel-jest'
  },
  testRegex: '(\.|/)(test|integration\.test)\.[tj]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@src/utils/logger$': '<rootDir>/tests/mocks/logger.ts',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@command/(.*)$': '<rootDir>/src/command/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@llm/(.*)$': '<rootDir>/src/llm/$1',
    '^@message/(.*)$': '<rootDir>/src/message/$1',
    '^@message/interfaces/messageConfig$': '<rootDir>/src/config/messageConfig.ts',
    '^@webhook/(.*)$': '<rootDir>/src/webhook/$1',
    '^@integrations/(.*)$': '<rootDir>/src/integrations/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@slack/web-api$': '<rootDir>/tests/mocks/slackWebApiMock.js',
    '^@slack/socket-mode$': '<rootDir>/tests/mocks/slackSocketModeMock.js',
    '^@slack/rtm-api$': '<rootDir>/tests/mocks/slackRtmApiMock.js',

  'discord.js': process.env.RUN_SYSTEM_TESTS === 'true' ? '<rootDir>/node_modules/discord.js' : '<rootDir>/tests/__mocks__/discord.js.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  verbose: true,
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transformIgnorePatterns: ["/node_modules/(?!chai|other-esm-dependency)"],
};