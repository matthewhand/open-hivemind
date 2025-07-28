import openWebUIConfig from '../../src/config/openWebUIConfig';

describe('openWebUIConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshOpenWebUIConfig = require('../../src/config/openWebUIConfig').default;

    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_API_URL')).toBe('http://host.docker.internal:3000/api/');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_USERNAME')).toBe('admin');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_PASSWORD')).toBe('password123');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_KNOWLEDGE_FILE')).toBe('');
    expect(freshOpenWebUIConfig.get('OPEN_WEBUI_MODEL')).toBe('llama3.2');

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => openWebUIConfig.validate({ allowed: 'strict' })).not.toThrow();
  });

  describe('environment variables', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('should load from environment variables', () => {
      process.env.OPEN_WEBUI_API_URL = 'http://localhost:3000/api/';
      process.env.OPEN_WEBUI_USERNAME = 'testuser';
      process.env.OPEN_WEBUI_MODEL = 'llama3.1';
      
      const config = require('../../src/config/openWebUIConfig').default;
      expect(config.get('OPEN_WEBUI_API_URL')).toBe('http://localhost:3000/api/');
      expect(config.get('OPEN_WEBUI_USERNAME')).toBe('testuser');
      expect(config.get('OPEN_WEBUI_MODEL')).toBe('llama3.1');
    });

  });
});