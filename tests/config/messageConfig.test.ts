jest.unmock('../../src/config/messageConfig');
import messageConfig from '../../src/config/messageConfig';

describe('messageConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshMessageConfig = require('../../src/config/messageConfig').default;

    expect(freshMessageConfig.get('MESSAGE_PROVIDER')).toBe('slack');
    expect(freshMessageConfig.get('MESSAGE_IGNORE_BOTS')).toBe(true);
    expect(freshMessageConfig.get('MESSAGE_ADD_USER_HINT')).toBe(true);
    expect(freshMessageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL')).toBe(5);
    expect(freshMessageConfig.get('MESSAGE_MIN_DELAY')).toBe(1000);
    expect(freshMessageConfig.get('MESSAGE_MAX_DELAY')).toBe(10000);
    expect(freshMessageConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW')).toBe(300000);
    // Note: MESSAGE_WAKEWORDS is an array in the config file, not a string
    expect(freshMessageConfig.get('MESSAGE_WAKEWORDS')).toEqual(['!help', '!ping']);
    expect(freshMessageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO')).toBe(true);
    expect(freshMessageConfig.get('MESSAGE_INTERACTIVE_FOLLOWUPS')).toBe(false);
    expect(freshMessageConfig.get('MESSAGE_UNSOLICITED_ADDRESSED')).toBe(false);
    expect(freshMessageConfig.get('MESSAGE_UNSOLICITED_UNADDRESSED')).toBe(false);
    expect(freshMessageConfig.get('MESSAGE_RESPOND_IN_THREAD')).toBe(false);
    expect(freshMessageConfig.get('MESSAGE_THREAD_RELATION_WINDOW')).toBe(300000);
    // Note: Using value from config file (0.5) instead of default (0.001)
    expect(freshMessageConfig.get('MESSAGE_RECENT_ACTIVITY_DECAY_RATE')).toBe(0.5);
    // Note: Using value from config file (0.4) instead of default (0.3)
    expect(freshMessageConfig.get('MESSAGE_INTERROBANG_BONUS')).toBe(0.4);
    // Note: Using value from config file (0.1) instead of default (-1.0)
    expect(freshMessageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER')).toBe(0.1);
    expect(freshMessageConfig.get('MESSAGE_COMMAND_INLINE')).toBe(true);
    expect(freshMessageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS')).toBe('');
    expect(freshMessageConfig.get('MESSAGE_LLM_FOLLOW_UP')).toBe(false);
    expect(freshMessageConfig.get('BOT_ID')).toBe('slack-bot');
    expect(freshMessageConfig.get('MESSAGE_MIN_INTERVAL_MS')).toBe(3000);
    expect(freshMessageConfig.get('MESSAGE_STRIP_BOT_ID')).toBe(true);
    expect(freshMessageConfig.get('MESSAGE_USERNAME_OVERRIDE')).toBe('MadgwickAI');

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => messageConfig.validate({ allowed: 'warn' })).not.toThrow();
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
      process.env.MESSAGE_PROVIDER = 'discord';
      process.env.MESSAGE_IGNORE_BOTS = 'false';
      process.env.MESSAGE_MIN_DELAY = '2000';
      
      const config = require('../../src/config/messageConfig').default;
      expect(config.get('MESSAGE_PROVIDER')).toBe('discord');
      expect(config.get('MESSAGE_IGNORE_BOTS')).toBe(false);
      expect(config.get('MESSAGE_MIN_DELAY')).toBe(2000);
    });

  });
});