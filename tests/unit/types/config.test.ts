import {
  isDiscordConfig,
  isSlackConfig,
  isMattermostConfig,
  isOpenAIConfig,
  isFlowiseConfig,
  isBotConfig,
  isSecureConfig,
  isMcpServerConfig,
  isMcpGuardConfig,
} from '../../../src/types/config';

describe('Config Type Guards', () => {
  describe('isDiscordConfig', () => {
    it('returns true for a valid DiscordConfig', () => {
      expect(isDiscordConfig({ token: 'discord-token-abc' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscordConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isDiscordConfig(undefined)).toBe(false);
    });

    it('returns false when token is missing', () => {
      expect(isDiscordConfig({ guildId: 'g-123' })).toBe(false);
    });

    it('returns false when token is not a string', () => {
      expect(isDiscordConfig({ token: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isDiscordConfig('string')).toBe(false);
      expect(isDiscordConfig(42)).toBe(false);
      expect(isDiscordConfig(true)).toBe(false);
    });
  });

  describe('isSlackConfig', () => {
    it('returns true for a valid SlackConfig', () => {
      expect(isSlackConfig({ botToken: 'xoxb-token', signingSecret: 'secret123' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSlackConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSlackConfig(undefined)).toBe(false);
    });

    it('returns false when botToken is missing', () => {
      expect(isSlackConfig({ signingSecret: 'secret123' })).toBe(false);
    });

    it('returns false when signingSecret is missing', () => {
      expect(isSlackConfig({ botToken: 'xoxb-token' })).toBe(false);
    });

    it('returns false when botToken is not a string', () => {
      expect(isSlackConfig({ botToken: 123, signingSecret: 'secret123' })).toBe(false);
    });

    it('returns false when signingSecret is not a string', () => {
      expect(isSlackConfig({ botToken: 'xoxb-token', signingSecret: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSlackConfig('string')).toBe(false);
      expect(isSlackConfig(42)).toBe(false);
      expect(isSlackConfig(true)).toBe(false);
    });
  });

  describe('isMattermostConfig', () => {
    it('returns true for a valid MattermostConfig', () => {
      expect(isMattermostConfig({ serverUrl: 'https://mm.example.com', token: 'mm-token' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isMattermostConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isMattermostConfig(undefined)).toBe(false);
    });

    it('returns false when serverUrl is missing', () => {
      expect(isMattermostConfig({ token: 'mm-token' })).toBe(false);
    });

    it('returns false when token is missing', () => {
      expect(isMattermostConfig({ serverUrl: 'https://mm.example.com' })).toBe(false);
    });

    it('returns false when serverUrl is not a string', () => {
      expect(isMattermostConfig({ serverUrl: 123, token: 'mm-token' })).toBe(false);
    });

    it('returns false when token is not a string', () => {
      expect(isMattermostConfig({ serverUrl: 'https://mm.example.com', token: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isMattermostConfig('string')).toBe(false);
      expect(isMattermostConfig(42)).toBe(false);
      expect(isMattermostConfig(true)).toBe(false);
    });
  });

  describe('isOpenAIConfig', () => {
    it('returns true for a valid OpenAIConfig', () => {
      expect(isOpenAIConfig({ apiKey: 'sk-abc123' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isOpenAIConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isOpenAIConfig(undefined)).toBe(false);
    });

    it('returns false when apiKey is missing', () => {
      expect(isOpenAIConfig({ model: 'gpt-4' })).toBe(false);
    });

    it('returns false when apiKey is not a string', () => {
      expect(isOpenAIConfig({ apiKey: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isOpenAIConfig('string')).toBe(false);
      expect(isOpenAIConfig(42)).toBe(false);
      expect(isOpenAIConfig(true)).toBe(false);
    });
  });

  describe('isFlowiseConfig', () => {
    it('returns true for a valid FlowiseConfig', () => {
      expect(isFlowiseConfig({ apiKey: 'flowise-key-123' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isFlowiseConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFlowiseConfig(undefined)).toBe(false);
    });

    it('returns false when apiKey is missing', () => {
      expect(isFlowiseConfig({ chatflowId: 'cf-123' })).toBe(false);
    });

    it('returns false when apiKey is not a string', () => {
      expect(isFlowiseConfig({ apiKey: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isFlowiseConfig('string')).toBe(false);
      expect(isFlowiseConfig(42)).toBe(false);
      expect(isFlowiseConfig(true)).toBe(false);
    });
  });

  describe('isBotConfig', () => {
    it('returns true for a valid BotConfig', () => {
      expect(
        isBotConfig({ name: 'testbot', messageProvider: 'discord', llmProvider: 'openai' })
      ).toBe(true);
    });

    it('returns false for null', () => {
      expect(isBotConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isBotConfig(undefined)).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(isBotConfig({ messageProvider: 'discord', llmProvider: 'openai' })).toBe(false);
    });

    it('returns false when messageProvider is missing', () => {
      expect(isBotConfig({ name: 'testbot', llmProvider: 'openai' })).toBe(false);
    });

    it('returns false when llmProvider is missing', () => {
      expect(isBotConfig({ name: 'testbot', messageProvider: 'discord' })).toBe(false);
    });

    it('returns false when name is not a string', () => {
      expect(isBotConfig({ name: 123, messageProvider: 'discord', llmProvider: 'openai' })).toBe(false);
    });

    it('returns false when messageProvider is not a string', () => {
      expect(isBotConfig({ name: 'testbot', messageProvider: 123, llmProvider: 'openai' })).toBe(false);
    });

    it('returns false when llmProvider is not a string', () => {
      expect(isBotConfig({ name: 'testbot', messageProvider: 'discord', llmProvider: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isBotConfig('string')).toBe(false);
      expect(isBotConfig(42)).toBe(false);
      expect(isBotConfig(true)).toBe(false);
    });
  });

  describe('isSecureConfig', () => {
    const validSecureConfig = {
      id: 'sc-123',
      name: 'myconfig',
      type: 'discord',
      data: { token: 'secret' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      checksum: 'abc123def456',
    };

    it('returns true for a valid SecureConfig', () => {
      expect(isSecureConfig(validSecureConfig)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSecureConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSecureConfig(undefined)).toBe(false);
    });

    it('returns false when id is missing', () => {
      const { id, ...rest } = validSecureConfig;
      expect(isSecureConfig(rest)).toBe(false);
    });

    it('returns false when name is missing', () => {
      const { name, ...rest } = validSecureConfig;
      expect(isSecureConfig(rest)).toBe(false);
    });

    it('returns false when type is missing', () => {
      const { type, ...rest } = validSecureConfig;
      expect(isSecureConfig(rest)).toBe(false);
    });

    it('returns false when data is missing', () => {
      const { data, ...rest } = validSecureConfig;
      expect(isSecureConfig(rest)).toBe(false);
    });

    it('returns false when createdAt is missing', () => {
      const { createdAt, ...rest } = validSecureConfig;
      expect(isSecureConfig(rest)).toBe(false);
    });

    it('returns false when updatedAt is missing', () => {
      const { updatedAt, ...rest } = validSecureConfig;
      expect(isSecureConfig(rest)).toBe(false);
    });

    it('returns false when checksum is missing', () => {
      const { checksum, ...rest } = validSecureConfig;
      expect(isSecureConfig(rest)).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(isSecureConfig({ ...validSecureConfig, id: 123 })).toBe(false);
    });

    it('returns false when data is not an object', () => {
      expect(isSecureConfig({ ...validSecureConfig, data: 'not-object' })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSecureConfig('string')).toBe(false);
      expect(isSecureConfig(42)).toBe(false);
      expect(isSecureConfig(true)).toBe(false);
    });
  });

  describe('isMcpServerConfig', () => {
    it('returns true for a valid McpServerConfig', () => {
      expect(isMcpServerConfig({ name: 'mcp-server-1' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isMcpServerConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isMcpServerConfig(undefined)).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(isMcpServerConfig({ url: 'http://localhost:3000' })).toBe(false);
    });

    it('returns false when name is not a string', () => {
      expect(isMcpServerConfig({ name: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isMcpServerConfig('string')).toBe(false);
      expect(isMcpServerConfig(42)).toBe(false);
      expect(isMcpServerConfig(true)).toBe(false);
    });
  });

  describe('isMcpGuardConfig', () => {
    it('returns true for a valid McpGuardConfig', () => {
      expect(isMcpGuardConfig({ enabled: true, type: 'rate-limit' })).toBe(true);
    });

    it('returns true when enabled is false', () => {
      expect(isMcpGuardConfig({ enabled: false, type: 'rate-limit' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isMcpGuardConfig(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isMcpGuardConfig(undefined)).toBe(false);
    });

    it('returns false when enabled is missing', () => {
      expect(isMcpGuardConfig({ type: 'rate-limit' })).toBe(false);
    });

    it('returns false when type is missing', () => {
      expect(isMcpGuardConfig({ enabled: true })).toBe(false);
    });

    it('returns false when enabled is not a boolean', () => {
      expect(isMcpGuardConfig({ enabled: 'true', type: 'rate-limit' })).toBe(false);
    });

    it('returns false when type is not a string', () => {
      expect(isMcpGuardConfig({ enabled: true, type: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isMcpGuardConfig('string')).toBe(false);
      expect(isMcpGuardConfig(42)).toBe(false);
      expect(isMcpGuardConfig(true)).toBe(false);
    });
  });
});
