jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  // any other logger methods used
}));


// tests/config/configurationManager.test.js
const fs = require('fs');
const configurationManager = require('../../src/config/configurationManager');

// Mock the fs module to control its behavior in tests
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

describe('ConfigurationManager', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks();
  });

  it('loads configuration from file', () => {
    // Setup your mock data
    const mockConfig = { databaseUrl: 'http://localhost:5432', apiKey: 'fromFile' };
    
    // Mock fs methods to simulate file existence and content
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // Call the method under test
    configurationManager.loadConfig();

    // Assert that configuration values are correctly loaded from the mocked file
    expect(configurationManager.getConfig('databaseUrl')).toBe('http://localhost:5432');
    expect(configurationManager.getConfig('apiKey')).toBe('fromFile');

    // Optional: Verify that fs methods were called as expected
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.any(String), 'utf-8');
  });

  // Add more tests as needed for different scenarios, such as when the file does not exist
});
