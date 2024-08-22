module.exports = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["html", "text", "lcov"],

  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\.|/)(test|spec))\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/',
    '^@discord/(.*)$': '<rootDir>/src/message/discord/',
  },
  setupFiles: ['module-alias/register'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  verbose: true,
};
