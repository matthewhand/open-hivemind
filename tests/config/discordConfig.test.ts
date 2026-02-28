import discordConfig from '../../src/config/discordConfig';

describe('discordConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = { NODE_ENV: 'test', NODE_CONFIG_DIR: '/dev/null' };

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshDiscordConfig = require('../../src/config/discordConfig').default;

    expect(freshDiscordConfig.get('DISCORD_BOT_TOKEN')).toBe('');
    expect(freshDiscordConfig.get('DISCORD_CLIENT_ID')).toBe('');
    expect(freshDiscordConfig.get('DISCORD_GUILD_ID')).toBe('');
    expect(freshDiscordConfig.get('DISCORD_AUDIO_DIR')).toBe('./data/audio');
    expect(freshDiscordConfig.get('DISCORD_WELCOME_MESSAGE')).toBe('Welcome to the server!');
    expect(freshDiscordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT')).toBe(10);
    expect(freshDiscordConfig.get('DISCORD_CHANNEL_ID')).toBe('');
    expect(freshDiscordConfig.get('DISCORD_DEFAULT_CHANNEL_ID')).toBe('');
    expect(freshDiscordConfig.get('DISCORD_CHANNEL_BONUSES')).toEqual({});
    expect(freshDiscordConfig.get('DISCORD_UNSOLICITED_CHANCE_MODIFIER')).toBe(1.0);
    expect(freshDiscordConfig.get('DISCORD_VOICE_CHANNEL_ID')).toBe('');
    expect(freshDiscordConfig.get('DISCORD_MAX_MESSAGE_LENGTH')).toBe(2000);
    expect(freshDiscordConfig.get('DISCORD_INTER_PART_DELAY_MS')).toBe(1000);
    expect(freshDiscordConfig.get('DISCORD_TYPING_DELAY_MAX_MS')).toBe(5000);
    expect(freshDiscordConfig.get('DISCORD_PRIORITY_CHANNEL')).toBe('');
    expect(freshDiscordConfig.get('DISCORD_PRIORITY_CHANNEL_BONUS')).toBe(1.1);
    expect(freshDiscordConfig.get('DISCORD_LOGGING_ENABLED')).toBe(false);
    expect(freshDiscordConfig.get('DISCORD_MESSAGE_PROCESSING_DELAY_MS')).toBe(0);

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => discordConfig.validate({ allowed: 'strict' })).not.toThrow();
  });

  describe('channel-bonuses format', () => {
    it('should parse string format', () => {
      process.env.DISCORD_CHANNEL_BONUSES = 'channel1:1.5,channel2:2.0';
      // Reset modules to ensure fresh load with environment variable
      jest.resetModules();
      const config = require('../../src/config/discordConfig').default;
      expect(config.get('DISCORD_CHANNEL_BONUSES')).toEqual({
        channel1: 1.5,
        channel2: 2.0
      });
    });

    it('should handle empty value', () => {
      process.env.DISCORD_CHANNEL_BONUSES = '';
      // Reset modules to ensure fresh load with environment variable
      jest.resetModules();
      const config = require('../../src/config/discordConfig').default;
      expect(config.get('DISCORD_CHANNEL_BONUSES')).toEqual({});
    });

    it('should parse JSON format', () => {
      process.env.DISCORD_CHANNEL_BONUSES = '{"ch1":1.5,"ch2":0.8}';
      jest.resetModules();
      const config = require('../../src/config/discordConfig').default;
      expect(config.get('DISCORD_CHANNEL_BONUSES')).toEqual({
        ch1: 1.5,
        ch2: 0.8
      });
    });

    it('should clamp values to valid range', () => {
      process.env.DISCORD_CHANNEL_BONUSES = 'ch1:-1.0,ch2:5.0,ch3:1.5';
      jest.resetModules();
      const config = require('../../src/config/discordConfig').default;
      expect(config.get('DISCORD_CHANNEL_BONUSES')).toEqual({
        ch1: 0.0, // Clamped from -1.0
        ch2: 2.0, // Clamped from 5.0
        ch3: 1.5  // Valid value
      });
    });
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
      process.env.DISCORD_BOT_TOKEN = 'test-token';
      process.env.DISCORD_MESSAGE_HISTORY_LIMIT = '20';

      const config = require('../../src/config/discordConfig').default;
      expect(config.get('DISCORD_BOT_TOKEN')).toBe('test-token');
      expect(config.get('DISCORD_MESSAGE_HISTORY_LIMIT')).toBe(20);
    });

  });
});