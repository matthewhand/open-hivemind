const unitIntegrationProject = {
  displayName: 'unit-integration',
  roots: ['<rootDir>/tests', '<rootDir>/src/client'],
  preset: 'ts-jest',
  // Use jsdom so React Testing Library can render components
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.js$': 'babel-jest'
  },
  testRegex: '(\\.|/)(test|integration\\.test)\\.[tj]sx?$',
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
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/e2e/',
    'tests/integrations/.*\\.real\\.test\\.[tj]s$'
  ],
  transformIgnorePatterns: ['/node_modules/(?!chai|other-esm-dependency|node-fetch|data-uri-to-buffer|@modelcontextprotocol/sdk|fetch-blob)'],
};

const realIntegrationProject = {
  displayName: 'real-integration',
  roots: ['<rootDir>/tests'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.js$': 'babel-jest'
  },
  testRegex: '(\\.|/)(real\\.test)\\.[tj]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@integrations/(.*)$': '<rootDir>/src/integrations/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/real.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/unit/', '/tests/integration/'],
};

// Fast client-only project (no backend heavy tests). Activated when JEST_FRONTEND_ONLY=1
const clientOnlyProject = {
  displayName: 'client-ui-fast',
  roots: ['<rootDir>/src/client/src'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },
  testRegex: '(\\.|/)(test)\\.[tj]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: unitIntegrationProject.moduleNameMapper,
  setupFilesAfterEnv: unitIntegrationProject.setupFilesAfterEnv,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

// Optional single test isolation to prevent discovery of all files when running one test.
// Usage: ONLY_TEST_PATH=relative/path/to/testfile.test.tsx JEST_FRONTEND_ONLY=1 npx jest --selectProjects client-ui-fast
if (process.env.ONLY_TEST_PATH && process.env.JEST_FRONTEND_ONLY === '1') {
  const normalized = process.env.ONLY_TEST_PATH.replace(/^\.\/?/, '');
  // Remove broad testRegex so only the specified file runs.
  delete clientOnlyProject.testRegex;
  clientOnlyProject.testMatch = [`<rootDir>/${normalized}`];
  // Narrow roots to rootDir to avoid scanning the entire client tree.
  clientOnlyProject.roots = ['<rootDir>'];
  // Provide a hint in console when not in silent mode.
  console.log(`[jest] ONLY_TEST_PATH enabled -> running: ${normalized}`);
}

let projects = [unitIntegrationProject];
if (process.env.JEST_FRONTEND_ONLY === '1') {
  projects = [clientOnlyProject];
}

if (process.env.RUN_REAL_TESTS === 'true') {
  projects.push(realIntegrationProject);
}

const fastFrontendOnly = process.env.JEST_FRONTEND_ONLY === '1';

module.exports = {
  // Disable coverage collection for the fast frontend-only run to improve performance
  collectCoverage: !fastFrontendOnly,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  coverageThreshold: fastFrontendOnly ? undefined : {
    global: {
      branches: 59,
      functions: 72,
      lines: 72,
      statements: 71,
    },
  },
  projects,
};
