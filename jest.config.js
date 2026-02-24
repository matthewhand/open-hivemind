const unitIntegrationProject = {
  displayName: 'unit-integration',
  roots: ['<rootDir>/tests', '<rootDir>/packages'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  // testTimeout handled in setup files to avoid CLI conflicts
  transform: {
    '^.+\.tsx?$': 'babel-jest',
    '^.+\.jsx?$': 'babel-jest',
    '^.+\.js$': 'babel-jest',
  },
  testRegex: '(\.|/)(test|integration\.test)\.[tj]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    uuid: require.resolve('uuid'),
    '^@src/utils/logger$': '<rootDir>/tests/mocks/logger.ts',
    '^@src/integrations/slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@command/(.*)$': '<rootDir>/src/command/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@llm/(.*)$': '<rootDir>/src/llm/$1',
    '^@message/(.*)$': '<rootDir>/src/message/$1',
    '^@message/interfaces/messageConfig$': '<rootDir>/src/config/messageConfig.ts',
    '^@webhook/(.*)$': '<rootDir>/src/webhook/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@src/integrations/mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
    '^@integrations/slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
    '^@integrations/mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
    '^@integrations/(.*)$': '<rootDir>/src/integrations/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@hivemind/adapter-discord$': '<rootDir>/packages/adapter-discord/src/index.ts',
    '^@hivemind/adapter-discord/(.*)$': '<rootDir>/packages/adapter-discord/src/$1',
    '^@hivemind/adapter-slack$': '<rootDir>/packages/adapter-slack/src/index.ts',
    '^@hivemind/adapter-slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
    '^@hivemind/adapter-mattermost$': '<rootDir>/packages/adapter-mattermost/src/index.ts',
    '^@hivemind/adapter-mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
    '^@hivemind/provider-openai$': '<rootDir>/packages/provider-openai/src/index.ts',
    '^@hivemind/provider-openai/(.*)$': '<rootDir>/packages/provider-openai/src/$1',
    '^@slack/web-api$': '<rootDir>/tests/mocks/slackWebApiMock.js',
    '^@slack/socket-mode$': '<rootDir>/tests/mocks/slackSocketModeMock.js',
    '^@slack/rtm-api$': '<rootDir>/tests/mocks/slackRtmApiMock.js',
    sqlite$: '<rootDir>/tests/mocks/sqlite.ts',
    sqlite3$: '<rootDir>/tests/mocks/sqlite3.ts',
    bcrypt$: '<rootDir>/tests/mocks/bcrypt.ts',
    'discord.js':
      process.env.RUN_SYSTEM_TESTS === 'true'
        ? '<rootDir>/node_modules/discord.js'
        : '<rootDir>/tests/__mocks__/discord.js.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/e2e/',
    'tests/integrations/.*\.real\.test\.[tj]s$',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!chai|other-esm-dependency|node-fetch|data-uri-to-buffer|@modelcontextprotocol/sdk|fetch-blob|uuid)',
  ],
};

const realIntegrationProject = {
  displayName: 'real-integration',
  roots: ['<rootDir>/tests'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.tsx?$': 'babel-jest',
    '^.+\.jsx?$': 'babel-jest',
    '^.+\.js$': 'babel-jest',
  },
  testRegex: '(\.|/)(real\.test)\.[tj]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@src/integrations/slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
    '^@src/integrations/mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@integrations/slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
    '^@integrations/mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
    '^@integrations/(.*)$': '<rootDir>/src/integrations/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@hivemind/adapter-discord$': '<rootDir>/packages/adapter-discord/src/index.ts',
    '^@hivemind/adapter-discord/(.*)$': '<rootDir>/packages/adapter-discord/src/$1',
    '^@hivemind/adapter-slack$': '<rootDir>/packages/adapter-slack/src/index.ts',
    '^@hivemind/adapter-slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
    '^@hivemind/adapter-mattermost$': '<rootDir>/packages/adapter-mattermost/src/index.ts',
    '^@hivemind/adapter-mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/real.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/unit/', '/tests/integration/'],
};

const projects = [
  unitIntegrationProject,
  {
    displayName: 'frontend',
    roots: ['<rootDir>/src/client'],
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    transform: {
      '^.+\.tsx?$': 'babel-jest',
      '^.+\.jsx?$': 'babel-jest',
      '^.+\.js$': 'babel-jest',
    },
    testRegex: '(\.|/)(test)\.[tj]sx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
      uuid: require.resolve('uuid'),
      '^@src/utils/logger$': '<rootDir>/tests/mocks/logger.ts',
      '^@src/(.*)$': '<rootDir>/src/$1',
      '^@command/(.*)$': '<rootDir>/src/command/$1',
      '^@common/(.*)$': '<rootDir>/src/common/$1',
      '^@config/(.*)$': '<rootDir>/src/config/$1',
      '^@llm/(.*)$': '<rootDir>/src/llm/$1',
      '^@message/(.*)$': '<rootDir>/src/message/$1',
      '^@message/interfaces/messageConfig$': '<rootDir>/src/config/messageConfig.ts',
      '^@webhook/(.*)$': '<rootDir>/src/webhook/$1',
      '^@integrations/slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
      '^@integrations/mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
      '^@integrations/(.*)$': '<rootDir>/src/integrations/$1',
      '^@types/(.*)$': '<rootDir>/src/types/$1',
      '^@hivemind/adapter-discord$': '<rootDir>/packages/adapter-discord/src/index.ts',
      '^@hivemind/adapter-discord/(.*)$': '<rootDir>/packages/adapter-discord/src/$1',
      '^@hivemind/adapter-slack$': '<rootDir>/packages/adapter-slack/src/index.ts',
      '^@hivemind/adapter-slack/(.*)$': '<rootDir>/packages/adapter-slack/src/$1',
      '^@hivemind/adapter-mattermost$': '<rootDir>/packages/adapter-mattermost/src/index.ts',
      '^@hivemind/adapter-mattermost/(.*)$': '<rootDir>/packages/adapter-mattermost/src/$1',
      '^@slack/web-api$': '<rootDir>/tests/mocks/slackWebApiMock.js',
      '^@slack/socket-mode$': '<rootDir>/tests/mocks/slackSocketModeMock.js',
      '^@slack/rtm-api$': '<rootDir>/tests/mocks/slackRtmApiMock.js',
      sqlite$: '<rootDir>/tests/mocks/sqlite.ts',
      sqlite3$: '<rootDir>/tests/mocks/sqlite3.ts',
      bcrypt$: '<rootDir>/tests/mocks/bcrypt.ts',
      'discord.js':
        process.env.RUN_SYSTEM_TESTS === 'true'
          ? '<rootDir>/node_modules/discord.js'
          : '<rootDir>/tests/__mocks__/discord.js.ts',
    },
    setupFilesAfterEnv: ['<rootDir>/src/client/src/setupTests.ts'],
    testPathIgnorePatterns: [
      '/node_modules/',
      '/dist/',
      '/tests/e2e/',
      'tests/integrations/.*\.real\.test\.[tj]s$',
    ],
    transformIgnorePatterns: [
      '/node_modules/(?!chai|other-esm-dependency|node-fetch|data-uri-to-buffer|@modelcontextprotocol/sdk|fetch-blob)',
    ],
  },
];

if (process.env.RUN_REAL_TESTS === 'true') {
  projects.push(realIntegrationProject);
}

module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov'],

  projects,
};
