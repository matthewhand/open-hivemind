import { MessageSchema } from '../../src/config/schemas/messageSchema';

describe('messageConfig', () => {
  beforeEach(() => {
    jest.resetModules();
    // Clear environment
    delete process.env.MESSAGE_PROVIDER;
    delete process.env.MESSAGE_WAKEWORDS;
    delete process.env.DISCORD_MESSAGE_TEMPLATES;
  });

  it('should have config values with correct types', () => {
    const messageConfig = require('../../src/config/messageConfig').default;
    expect(typeof messageConfig.get('MESSAGE_PROVIDER')).toBe('string');
    expect(typeof messageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL')).toBe('number');
  });

  it('should validate schema', () => {
    const messageConfig = require('../../src/config/messageConfig').default;
    expect(() => messageConfig.validate({ allowed: 'strict' })).not.toThrow();
  });

  describe('environment variables', () => {
    it('should load from environment variables', () => {
      process.env.MESSAGE_PROVIDER = 'discord';
      process.env.MESSAGE_WAKEWORDS = '!hello, !hey';
      
      const messageConfig = require('../../src/config/messageConfig').default;
      expect(messageConfig.get('MESSAGE_PROVIDER')).toBe('discord');
      expect(messageConfig.get('MESSAGE_WAKEWORDS')).toEqual(['!hello', '!hey']);
    });

    it('throws on invalid JSON in env override', () => {
      process.env.DISCORD_MESSAGE_TEMPLATES = '{invalid-json';
      
      expect(() => {
        // Must require inside to trigger the top-level load
        require('../../src/config/messageConfig');
      }).toThrow('Invalid JSON: {invalid-json');
    });
  });
});
