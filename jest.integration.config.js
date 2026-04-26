const baseConfig = require('./jest.config.js');

const moduleNameMapper = { ...baseConfig.moduleNameMapper };
delete moduleNameMapper['^pg$'];
delete moduleNameMapper['better-sqlite3$'];
delete moduleNameMapper['sqlite3$'];
delete moduleNameMapper['sqlite$'];

module.exports = {
  ...baseConfig,
  moduleNameMapper,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/e2e/',
  ],
};
