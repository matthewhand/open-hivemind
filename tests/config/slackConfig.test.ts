import slackConfig from '../../src/config/slackConfig';

describe('slackConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshSlackConfig = require('../../src/config/slackConfig').default;

    expect(freshSlackConfig.get('SLACK_BOT_TOKEN')).toBe('');
    expect(freshSlackConfig.get('SLACK_APP_TOKEN')).toBe('');
    expect(freshSlackConfig.get('SLACK_SIGNING_SECRET')).toBe('');
    expect(freshSlackConfig.get('SLACK_JOIN_CHANNELS')).toBe('C08BC0X4DFD');
    expect(freshSlackConfig.get('SLACK_DEFAULT_CHANNEL_ID')).toBe('C08BC0X4DFD');
    expect(freshSlackConfig.get('SLACK_MODE')).toBe('socket');
    expect(freshSlackConfig.get('SLACK_BOT_JOIN_CHANNEL_MESSAGE')).toContain('Bot joined the {channel} channel');
    expect(freshSlackConfig.get('SLACK_USER_JOIN_CHANNEL_MESSAGE')).toContain('Welcome, {user}');
    expect(freshSlackConfig.get('SLACK_BOT_LEARN_MORE_MESSAGE')).toContain('Here’s more info about channel');
    expect(freshSlackConfig.get('SLACK_BUTTON_MAPPINGS')).toContain('learn_objectives');
    expect(freshSlackConfig.get('WELCOME_RESOURCE_URL')).toBe('https://university.example.com/resources');
    expect(freshSlackConfig.get('REPORT_ISSUE_URL')).toBe('https://university.example.com/report-issue');

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => slackConfig.validate({ allowed: 'strict' })).not.toThrow();
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
      process.env.SLACK_BOT_TOKEN = 'test-token';
      process.env.SLACK_MODE = 'rtm';
      
      const config = require('../../src/config/slackConfig').default;
      expect(config.get('SLACK_BOT_TOKEN')).toBe('test-token');
      expect(config.get('SLACK_MODE')).toBe('rtm');
    });

  });
});