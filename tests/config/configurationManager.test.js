const ConfigurationManager = require('../../src/config/configurationManager');
const fs = require('fs');
jest.mock('fs');

describe('ConfigurationManager', () => {
    let configManager;
    const configFilePath = './config.json'; // Ensure this matches your actual config file path

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        // Create a new instance of ConfigurationManager for each test to avoid state leakage
        configManager = new ConfigurationManager(configFilePath);
    });

    test('loads configuration from file', () => {
        // Mock fs.readFileSync to simulate reading a config file
        const mockConfig = JSON.stringify({
            databaseUrl: 'http://localhost:5432',
            apiKey: '12345'
        });
        fs.readFileSync.mockReturnValue(mockConfig);

        configManager.loadConfig(); // Assuming loadConfig is the method that reads the file

        // Verify that fs.readFileSync was called with the correct arguments
        expect(fs.readFileSync).toHaveBeenCalledWith(configFilePath, 'utf8');
        // Verify that the configuration values are correctly loaded
        expect(configManager.getConfig('databaseUrl')).toBe('http://localhost:5432');
        expect(configManager.getConfig('apiKey')).toBe('12345');
    });

    test('saves configuration to file', () => {
        // Define the configuration data you expect to save
        const configData = {
            databaseUrl: 'http://localhost:5432',
            apiKey: 'abcde'
        };

        // Simulate saving the configuration
        configManager.saveConfig(configData);

        // Verify that fs.writeFileSync was called with the correct arguments
        expect(fs.writeFileSync).toHaveBeenCalledWith(configFilePath, JSON.stringify(configData, null, 2), 'utf8');
    });

    test('applies environment variables over file config', () => {
        // Mock fs.readFileSync to simulate reading a config file with initial values
        const mockFileConfig = JSON.stringify({
            databaseUrl: 'http://localhost:5432',
            apiKey: 'fromFile'
        });
        fs.readFileSync.mockReturnValue(mockFileConfig);

        // Set an environment variable that should override the file configuration
        process.env.apiKey = 'fromEnv';

        // Reload configuration to apply environment variables
        configManager.loadConfig();

        // Verify that the file configuration is unchanged for properties not in environment variables
        expect(configManager.getConfig('databaseUrl')).toBe('http://localhost:5432');
        // Verify that the environment variable overrides the file configuration
        expect(configManager.getConfig('apiKey')).toBe('fromEnv');
    });

    afterEach(() => {
        // Clean up any mocked environment variables to avoid side effects between tests
        delete process.env.apiKey;
    });

    // Add more tests as needed...
});
