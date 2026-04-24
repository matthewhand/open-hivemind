const baseConfig = require('./jest.config.js');

const moduleNameMapper = { ...baseConfig.moduleNameMapper };
delete moduleNameMapper['^pg$'];

module.exports = {
  ...baseConfig,
  moduleNameMapper,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/e2e/',
  ],
};
