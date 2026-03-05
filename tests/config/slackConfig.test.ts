import slackConfig from '../../src/config/slackConfig';

describe('slackConfig', () => {
  it('should handle complex Slack configuration scenarios with validation', () => {
    const OLD_ENV = process.env;
    
    // Test complex configuration with multiple environment variables
    process.env.SLACK_BOT_TOKEN = 'xoxb-complex-token-1234567890';
    process.env.SLACK_APP_TOKEN = 'xapp-complex-app-token-0987654321';
    process.env.SLACK_SIGNING_SECRET = 'complex-signing-secret-hash';
    process.env.SLACK_MODE = 'rtm';
    process.env.SLACK_JOIN_CHANNELS = 'C1234567890,C0987654321,C1122334455';
    process.env.SLACK_DEFAULT_CHANNEL_ID = 'C1234567890';
    process.env.SLACK_BUTTON_MAPPINGS = 'learn_objectives:Learn,report_issue:Report';
    
    jest.resetModules();
    const config = require('../../src/config/slackConfig').default;
    
    // Validate complex configuration loading
    expect(config.get('SLACK_BOT_TOKEN')).toBe('xoxb-complex-token-1234567890');
    expect(config.get('SLACK_APP_TOKEN')).toBe('xapp-complex-app-token-0987654321');
    expect(config.get('SLACK_SIGNING_SECRET')).toBe('complex-signing-secret-hash');
    expect(config.get('SLACK_MODE')).toBe('rtm');
    expect(config.get('SLACK_JOIN_CHANNELS')).toBe('C1234567890,C0987654321,C1122334455');
    expect(config.get('SLACK_DEFAULT_CHANNEL_ID')).toBe('C1234567890');
    
    // Validate message templates with placeholders
    const joinMessage = config.get('SLACK_BOT_JOIN_CHANNEL_MESSAGE');
    expect(joinMessage).toContain('{channel}');
    expect(joinMessage.length).toBeGreaterThan(20);
    
    const userMessage = config.get('SLACK_USER_JOIN_CHANNEL_MESSAGE');
    expect(userMessage).toContain('{user}');
    expect(userMessage.length).toBeGreaterThan(15);
    
    // Validate button mappings parsing
    const buttonMappings = config.get('SLACK_BUTTON_MAPPINGS');
    expect(buttonMappings).toContain('learn_objectives');
    expect(buttonMappings).toContain('Report');
    
    // Test validation with complex configuration
    expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    
    process.env = OLD_ENV;
  });

  it('should handle Slack configuration edge cases and validation scenarios', () => {
    const OLD_ENV = process.env;
    
    // Test with edge case configuration values
    process.env.SLACK_BOT_TOKEN = ''; // Empty token should be handled gracefully
    process.env.SLACK_MODE = 'rtm'; // Valid mode
    process.env.SLACK_JOIN_CHANNELS = ''; // Empty channels list should be handled
    process.env.SLACK_BUTTON_MAPPINGS = 'invalid-format-no-colon'; // Invalid format should be handled
    process.env.WELCOME_RESOURCE_URL = 'not-a-valid-url'; // Invalid URL should be handled
    
    jest.resetModules();
    const config = require('../../src/config/slackConfig').default;
    
    // Should handle empty values gracefully
    expect(config.get('SLACK_BOT_TOKEN')).toBe('');
    expect(config.get('SLACK_MODE')).toBe('rtm'); // Should accept valid mode
    expect(config.get('SLACK_JOIN_CHANNELS')).toBe(''); // Should accept empty value
    expect(config.get('SLACK_BUTTON_MAPPINGS')).toBe('invalid-format-no-colon'); // Should accept as-is
    
    // Should validate successfully with valid inputs
    expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    
    process.env = OLD_ENV;
  });

  it('should fail validation with invalid mode', () => {
    const OLD_ENV = process.env;
    
    // Test validation failure with invalid mode
    process.env.SLACK_MODE = 'invalid-mode';
    
    jest.resetModules();
    const config = require('../../src/config/slackConfig').default;
    
    // Should fail validation with invalid mode
    expect(() => config.validate({ allowed: 'strict' })).toThrow('SLACK_MODE: must be one of the possible values: ["socket","rtm"]');
    
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