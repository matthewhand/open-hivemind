import webhookConfig from '../../src/config/webhookConfig';

describe('webhookConfig', () => {
  it('should export a convict config object', () => {
    expect(webhookConfig).toBeDefined();
    expect(typeof webhookConfig.get).toBe('function');
  });

  it('should have sensible defaults', () => {
    expect(webhookConfig.get('WEBHOOK_ENABLED')).toBe(false);
    expect(webhookConfig.get('WEBHOOK_URL')).toBe('');
    expect(webhookConfig.get('WEBHOOK_TOKEN')).toBe('');
    expect(webhookConfig.get('WEBHOOK_IP_WHITELIST')).toBe('');
    expect(webhookConfig.get('WEBHOOK_PORT')).toBe(80);
  });

  it('should pass strict validation', () => {
    expect(() => webhookConfig.validate({ allowed: 'strict' })).not.toThrow();
  });

  it('WEBHOOK_ENABLED should be a boolean', () => {
    expect(typeof webhookConfig.get('WEBHOOK_ENABLED')).toBe('boolean');
  });

  it('WEBHOOK_PORT should be a number', () => {
    expect(typeof webhookConfig.get('WEBHOOK_PORT')).toBe('number');
  });
});
