jest.unmock('../../src/config/messageConfig');
import messageConfig from '../../src/config/messageConfig';

describe('messageConfig', () => {
  it('should have config values with correct types', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshMessageConfig = require('../../src/config/messageConfig').default;

    // Verify config loads without throwing and has expected types
    expect(typeof freshMessageConfig.get('MESSAGE_PROVIDER')).toBe('string');
    expect(typeof freshMessageConfig.get('MESSAGE_IGNORE_BOTS')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_ADD_USER_HINT')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_MIN_DELAY')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_MAX_DELAY')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW')).toBe('number');
    expect(Array.isArray(freshMessageConfig.get('MESSAGE_WAKEWORDS'))).toBe(true);
    expect(typeof freshMessageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_INTERACTIVE_FOLLOWUPS')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_UNSOLICITED_ADDRESSED')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_UNSOLICITED_UNADDRESSED')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_RESPOND_IN_THREAD')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_THREAD_RELATION_WINDOW')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_RECENT_ACTIVITY_DECAY_RATE')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_INTERROBANG_BONUS')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_COMMAND_INLINE')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS')).toBe('string');
    expect(typeof freshMessageConfig.get('MESSAGE_LLM_FOLLOW_UP')).toBe('boolean');
    expect(typeof freshMessageConfig.get('BOT_ID')).toBe('string');
    expect(typeof freshMessageConfig.get('MESSAGE_MIN_INTERVAL_MS')).toBe('number');
    expect(typeof freshMessageConfig.get('MESSAGE_STRIP_BOT_ID')).toBe('boolean');
    expect(typeof freshMessageConfig.get('MESSAGE_USERNAME_OVERRIDE')).toBe('string');

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