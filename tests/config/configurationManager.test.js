// tests/config/configurationManager.test.js
const fs = require('fs');
const configurationManager = require('../../src/config/configurationManager');

jest.mock('fs');

describe('ConfigurationManager', () => {
  it('loads configuration from file', () => {
    const mockConfig = { databaseUrl: 'http://localhost:5432', apiKey: 'fromFile' };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    configurationManager.loadConfig(); // Assuming this method exists and loads the config

    expect(configurationManager.getConfig('databaseUrl')).toBe('http://localhost:5432');
    expect(configurationManager.getConfig('apiKey')).toBe('fromFile');
  });
});
