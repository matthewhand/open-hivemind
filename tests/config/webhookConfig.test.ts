import webhookConfig from '../../src/config/webhookConfig';

describe('webhookConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshWebhookConfig = require('../../src/config/webhookConfig').default;

    expect(freshWebhookConfig.get('WEBHOOK_ENABLED')).toBe(false);
    expect(freshWebhookConfig.get('WEBHOOK_URL')).toBe('');
    expect(freshWebhookConfig.get('WEBHOOK_TOKEN')).toBe('');
    expect(freshWebhookConfig.get('WEBHOOK_IP_WHITELIST')).toBe('');
    expect(freshWebhookConfig.get('WEBHOOK_PORT')).toBe(80);

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => webhookConfig.validate({ allowed: 'strict' })).not.toThrow();
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
      process.env.WEBHOOK_ENABLED = 'true';
      process.env.WEBHOOK_URL = 'http://example.com/webhook';
      process.env.WEBHOOK_PORT = '3000';
      
      const config = require('../../src/config/webhookConfig').default;
      expect(config.get('WEBHOOK_ENABLED')).toBe(true);
      expect(config.get('WEBHOOK_URL')).toBe('http://example.com/webhook');
      expect(config.get('WEBHOOK_PORT')).toBe(3000);
    });

  });
});