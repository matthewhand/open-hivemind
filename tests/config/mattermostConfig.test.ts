import mattermostConfig from '../../src/config/mattermostConfig';

describe('mattermostConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshMattermostConfig = require('../../src/config/mattermostConfig').default;

    expect(freshMattermostConfig.get('MATTERMOST_SERVER_URL')).toBe('');
    expect(freshMattermostConfig.get('MATTERMOST_TOKEN')).toBe('');
    expect(freshMattermostConfig.get('MATTERMOST_CHANNEL')).toBe('');

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => mattermostConfig.validate({ allowed: 'strict' })).not.toThrow();
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
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      process.env.MATTERMOST_TOKEN = 'test-token';
      process.env.MATTERMOST_CHANNEL = 'test-channel';
      
      const config = require('../../src/config/mattermostConfig').default;
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
      expect(config.get('MATTERMOST_TOKEN')).toBe('test-token');
      expect(config.get('MATTERMOST_CHANNEL')).toBe('test-channel');
    });

  });
});