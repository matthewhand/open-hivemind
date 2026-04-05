import { ConfigurationValidator } from '../../../../src/server/services/ConfigurationValidator';

describe('ConfigurationValidator', () => {
  let validator: ConfigurationValidator;

  beforeEach(() => {
    validator = new ConfigurationValidator();
  });

  describe('validateBotConfig', () => {
    it('should return valid for minimal config with defaults', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when name is missing', () => {
      const result = validator.validateBotConfig({
        name: '',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bot name is required');
    });

    it('should fail when name is too short', () => {
      const result = validator.validateBotConfig({
        name: 'ab',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('characters'))).toBe(true);
    });

    it('should fail when name is too long', () => {
      const result = validator.validateBotConfig({
        name: 'a'.repeat(100),
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('less than'))).toBe(true);
    });

    it('should fail when messageProvider is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: '',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message provider is required');
    });

    it('should fail for invalid messageProvider', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'invalid',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid message provider'))).toBe(true);
    });

    it('should warn when Discord token format is unusual', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'unusual-token' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Discord token'))).toBe(true);
    });

    it('should fail when Discord token is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: {},
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Discord bot token is required');
    });

    it('should fail when Slack bot token is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        slack: { signingSecret: 'secret' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Slack bot token is required');
    });

    it('should fail when Slack signing secret is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        slack: { botToken: 'xoxb-token' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Slack signing secret is required');
    });

    it('should warn when Slack app token is missing in socket mode', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        slack: { botToken: 'xoxb-token', signingSecret: 'secret', mode: 'socket' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Slack app token'))).toBe(true);
    });

    it('should fail when Mattermost URL is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        mattermost: { token: 'token' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mattermost server URL is required');
    });

    it('should fail when Mattermost URL is invalid', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        mattermost: { serverUrl: 'not-a-url', token: 'token' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mattermost server URL must be a valid URL');
    });

    it('should fail when Mattermost token is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        mattermost: { serverUrl: 'https://mattermost.example.com' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mattermost token is required');
    });

    it('should fail when OpenAI API key is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: {},
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is required');
    });

    it('should warn when OpenAI API key format is wrong', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: { apiKey: 'not-sk-key' },
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('OpenAI API key'))).toBe(true);
    });

    it('should suggest specifying OpenAI model when not provided', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: { apiKey: 'sk-test-key' },
      });

      expect(result.isValid).toBe(true);
      expect(result.suggestions.some(s => s.includes('OpenAI model'))).toBe(true);
    });

    it('should fail when Flowise endpoint is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'flowise',
        discord: { token: 'Bot abc123' },
        flowise: {},
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flowise endpoint is required');
    });

    it('should fail when Flowise endpoint is invalid URL', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'flowise',
        discord: { token: 'Bot abc123' },
        flowise: { apiKey: 'key', endpoint: 'not-a-url' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flowise endpoint must be a valid URL');
    });

    it('should fail when OpenWebUI API key is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openwebui',
        discord: { token: 'Bot abc123' },
        openwebui: { endpoint: 'https://openwebui.example.com' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenWebUI API key is required');
    });

    it('should fail when OpenWebUI endpoint is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openwebui',
        discord: { token: 'Bot abc123' },
        openwebui: { apiKey: 'key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenWebUI endpoint is required');
    });

    it('should fail when OpenSwarm API key is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openswarm',
        discord: { token: 'Bot abc123' },
        openswarm: { endpoint: 'https://openswarm.example.com' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenSwarm API key is required');
    });

    it('should fail when OpenSwarm endpoint is missing', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openswarm',
        discord: { token: 'Bot abc123' },
        openswarm: { apiKey: 'key' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenSwarm endpoint is required');
    });

    it('should warn when system instruction is too long', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: { apiKey: 'sk-test-key' },
        systemInstruction: 'a'.repeat(5000),
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('System instruction is very long'))).toBe(true);
    });

    it('should suggest when system instruction is too short', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: { apiKey: 'sk-test-key' },
        systemInstruction: 'hi',
      });

      expect(result.isValid).toBe(true);
      expect(result.suggestions.some(s => s.includes('System instruction is very short'))).toBe(true);
    });

    it('should warn when MCP Guard has no allowed users', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: { apiKey: 'sk-test-key' },
        mcpGuard: { enabled: true, type: 'custom' },
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('MCP Guard'))).toBe(true);
    });

    it('should warn for custom persona', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot abc123' },
        openai: { apiKey: 'sk-test-key' },
        persona: 'my-custom-persona',
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Custom persona'))).toBe(true);
    });

    it('should validate string-based provider configs', () => {
      const result = validator.validateBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: 'string-config',
        openai: 'string-config',
      });

      // Should not crash, string configs are handled
      expect(result).toBeDefined();
    });
  });

  describe('validateBotConfigWithSchema', () => {
    it('should validate using convict schema', () => {
      const result = validator.validateBotConfigWithSchema({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });

    it('should fail schema validation for invalid provider', () => {
      const result = validator.validateBotConfigWithSchema({
        name: 'test-bot',
        messageProvider: 'invalid-provider',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('testBotConfig', () => {
    it('should return test result', async () => {
      const result = await validator.testBotConfig({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result.success).toBe(true);
      expect(result.details).toHaveProperty('messageProvider');
      expect(result.details).toHaveProperty('llmProvider');
    });
  });

  describe('validateAgainstEnvironment', () => {
    it('should warn about environment variable overrides', () => {
      const result = validator.validateAgainstEnvironment({
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });
  });
});
