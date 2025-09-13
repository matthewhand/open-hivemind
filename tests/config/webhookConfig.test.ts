import webhookConfig from '../../src/config/webhookConfig';

describe('webhookConfig', () => {
  it('should handle defaults, validation, and environment variables', () => {
    // Test default values
    const OLD_ENV = process.env;
    process.env = {};
    jest.resetModules();
    const freshWebhookConfig = require('../../src/config/webhookConfig').default;

    expect(freshWebhookConfig.get('WEBHOOK_ENABLED')).toBe(false);
    expect(freshWebhookConfig.get('WEBHOOK_URL')).toBe('');
    expect(freshWebhookConfig.get('WEBHOOK_TOKEN')).toBe('');
    expect(freshWebhookConfig.get('WEBHOOK_IP_WHITELIST')).toBe('');
    expect(freshWebhookConfig.get('WEBHOOK_PORT')).toBe(80);

    // Test schema validation
    expect(() => freshWebhookConfig.validate({ allowed: 'strict' })).not.toThrow();

    // Test environment variable loading
    process.env.WEBHOOK_ENABLED = 'true';
    process.env.WEBHOOK_URL = 'http://example.com/webhook';
    process.env.WEBHOOK_PORT = '3000';

    jest.resetModules();
    const envConfig = require('../../src/config/webhookConfig').default;
    expect(envConfig.get('WEBHOOK_ENABLED')).toBe(true);
    expect(envConfig.get('WEBHOOK_URL')).toBe('http://example.com/webhook');
    expect(envConfig.get('WEBHOOK_PORT')).toBe(3000);

    // Restore original environment variables
    process.env = OLD_ENV;
  });
});