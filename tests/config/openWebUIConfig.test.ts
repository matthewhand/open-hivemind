import openWebUIConfig from '../../src/config/openWebUIConfig';

describe('openWebUIConfig', () => {
  it('should handle defaults, validation, and environment variables', () => {
    // Test default values
    const OLD_ENV = process.env;
    process.env = {};
    jest.resetModules();
    const freshOpenWebUIConfig = require('../../src/config/openWebUIConfig').default;

    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_API_URL')).toBe('http://host.docker.internal:3000/api/');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_USERNAME')).toBe('admin');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_PASSWORD')).toBe('password123');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_KNOWLEDGE_FILE')).toBe('');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_MODEL')).toBe('llama3.2');

    // Test schema validation
    expect(() => freshOpenWebUIConfig.validate({ allowed: 'strict' })).not.toThrow();

    // Test environment variable loading
    process.env.OPEN_WEBUI_API_URL = 'http://localhost:3000/api/';
    process.env.OPEN_WEBUI_USERNAME = 'testuser';
    process.env.OPEN_WEBUI_MODEL = 'llama3.1';

    jest.resetModules();
    const envConfig = require('../../src/config/openWebUIConfig').default;
    expect(envConfig.get('OPEN_WEBUI_API_URL')).toBe('http://localhost:3000/api/');
    expect(envConfig.get('OPEN_WEBUI_USERNAME')).toBe('testuser');
    expect(envConfig.get('OPEN_WEBUI_MODEL')).toBe('llama3.1');

    // Restore original environment variables
    process.env = OLD_ENV;
  });
});