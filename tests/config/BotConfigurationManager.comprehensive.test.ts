import { BotConfigurationManager } from '@src/config/BotConfigurationManager';

describe('BotConfigurationManager Comprehensive', () => {
  let manager: BotConfigurationManager;

  beforeEach(() => {
    manager = new BotConfigurationManager();
  });

  it('should validate Discord configuration', () => {
    const config = {
      name: 'test-bot',
      discord: {
        botToken: 'valid-token',
        channelId: '123456789'
      }
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(true);
  });

  it('should validate Slack configuration', () => {
    const config = {
      name: 'test-bot',
      slack: {
        botToken: 'xoxb-valid-token',
        signingSecret: 'valid-secret'
      }
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid Discord token', () => {
    const config = {
      name: 'test-bot',
      discord: {
        botToken: '',
        channelId: '123456789'
      }
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Discord bot token is required');
  });

  it('should reject invalid Slack token', () => {
    const config = {
      name: 'test-bot',
      slack: {
        botToken: 'invalid-token',
        signingSecret: 'valid-secret'
      }
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(false);
  });

  it('should handle missing configuration sections', () => {
    const config = {
      name: 'test-bot'
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one platform configuration is required');
  });

  it('should validate bot names', () => {
    const config = {
      name: '',
      discord: {
        botToken: 'valid-token',
        channelId: '123456789'
      }
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Bot name is required');
  });

  it('should handle multiple platform configurations', () => {
    const config = {
      name: 'multi-bot',
      discord: {
        botToken: 'discord-token',
        channelId: '123456789'
      },
      slack: {
        botToken: 'xoxb-slack-token',
        signingSecret: 'slack-secret'
      }
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(true);
  });

  it('should validate channel IDs format', () => {
    const config = {
      name: 'test-bot',
      discord: {
        botToken: 'valid-token',
        channelId: 'invalid-channel-id'
      }
    };

    const result = manager.validateConfiguration(config);
    expect(result.isValid).toBe(false);
  });

  it('should handle configuration merging', () => {
    const baseConfig = {
      name: 'base-bot',
      discord: { botToken: 'token1' }
    };

    const overrideConfig = {
      discord: { channelId: '123456789' }
    };

    const merged = manager.mergeConfigurations(baseConfig, overrideConfig);
    
    expect(merged.name).toBe('base-bot');
    expect(merged.discord.botToken).toBe('token1');
    expect(merged.discord.channelId).toBe('123456789');
  });

  it('should sanitize sensitive information', () => {
    const config = {
      name: 'test-bot',
      discord: {
        botToken: 'secret-token-12345',
        channelId: '123456789'
      }
    };

    const sanitized = manager.sanitizeConfiguration(config);
    
    expect(sanitized.discord.botToken).toBe('secret-***');
    expect(sanitized.discord.channelId).toBe('123456789');
  });
});