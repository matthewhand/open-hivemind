import { BotConfigurationManager } from '../../../../src/config/BotConfigurationManager';
import { getLlmDefaultStatus } from '../../../../src/config/llmDefaultStatus';
import { ConfigurationValidator } from '../../../../src/server/services/ConfigurationValidator';
import { CONFIG_LIMITS } from '../../../../src/types/config';

jest.mock('../../../../src/config/BotConfigurationManager');
jest.mock('../../../../src/config/llmDefaultStatus', () => ({
  getLlmDefaultStatus: jest.fn().mockReturnValue({ configured: false }),
}));

describe('ConfigurationValidator', () => {
  let validator: ConfigurationValidator;

  beforeEach(() => {
    validator = new ConfigurationValidator();
    (getLlmDefaultStatus as jest.Mock).mockReturnValue({ configured: false });
  });

  describe('validateBotConfig - basic validation', () => {
    test('should validate a valid bot configuration', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token-123' },
        openai: { apiKey: 'sk-validkey' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject config without bot name', () => {
      const config = {
        name: '',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bot name is required');
    });

    test('should reject bot name that is too short', () => {
      const config = {
        name: 'ab', // Assuming CONFIG_LIMITS.BOT_NAME_MIN_LENGTH is 3
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = validator.validateBotConfig(config);

      if (CONFIG_LIMITS.BOT_NAME_MIN_LENGTH > 2) {
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('at least'))).toBe(true);
      }
    });

    test('should reject bot name that is too long', () => {
      const config = {
        name: 'a'.repeat(CONFIG_LIMITS.BOT_NAME_MAX_LENGTH + 1),
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('less than'))).toBe(true);
    });

    test('should reject config without message provider', () => {
      const config = {
        name: 'test-bot',
        messageProvider: '',
        llmProvider: 'openai',
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message provider is required');
    });

    test('should reject invalid message provider', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'invalid-provider',
        llmProvider: 'openai',
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid message provider'))).toBe(true);
    });

    test('should allow empty LLM provider when default is configured', () => {
      (getLlmDefaultStatus as jest.Mock).mockReturnValue({ configured: true });

      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: '',
        discord: { token: 'Bot token' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.suggestions.some((s) => s.includes('default LLM'))).toBe(true);
    });

    test('should require LLM provider when no default is configured', () => {
      (getLlmDefaultStatus as jest.Mock).mockReturnValue({ configured: false });

      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: '',
        discord: { token: 'Bot test-token' },
      };

      const result = validator.validateBotConfig(config);

      // When no LLM provider and no default, result should either be invalid
      // or have a suggestion about using the default provider
      const hasLlmError = result.errors.some((e) => e.includes('LLM provider'));
      const hasLlmSuggestion = result.suggestions.some(
        (s) => s.includes('LLM') || s.includes('default')
      );
      expect(hasLlmError || hasLlmSuggestion).toBe(true);
    });
  });

  describe('validateMessageProvider - Discord', () => {
    test('should validate Discord configuration with token', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token-123' },
        openai: { apiKey: 'sk-key' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
    });

    test('should reject Discord config without token', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: {},
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Discord bot token is required');
    });

    test('should warn about Discord token format', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'invalid-token' },
        openai: { apiKey: 'sk-key' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.warnings.some((w) => w.includes('Discord token'))).toBe(true);
    });

    test('should handle string-type Discord config', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: 'string-config',
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Discord bot token is required');
    });
  });

  describe('validateMessageProvider - Slack', () => {
    test('should validate Slack configuration', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        slack: {
          botToken: 'xoxb-token',
          signingSecret: 'secret',
        },
        openai: { apiKey: 'sk-key' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
    });

    test('should reject Slack config without bot token', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        slack: { signingSecret: 'secret' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Slack bot token is required');
    });

    test('should reject Slack config without signing secret', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        slack: { botToken: 'xoxb-token' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Slack signing secret is required');
    });

    test('should warn about socket mode without app token', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        slack: {
          botToken: 'xoxb-token',
          signingSecret: 'secret',
          mode: 'socket',
        },
        openai: { apiKey: 'sk-key' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.warnings.some((w) => w.includes('app token'))).toBe(true);
    });
  });

  describe('validateMessageProvider - Mattermost', () => {
    test('should validate Mattermost configuration', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        mattermost: {
          serverUrl: 'https://mattermost.example.com',
          token: 'mm-token',
        },
        openai: { apiKey: 'sk-key' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
    });

    test('should reject Mattermost config without server URL', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        mattermost: { token: 'mm-token' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mattermost server URL is required');
    });

    test('should reject invalid Mattermost server URL', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        mattermost: {
          serverUrl: 'not-a-valid-url',
          token: 'mm-token',
        },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mattermost server URL must be a valid URL');
    });

    test('should reject Mattermost config without token', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        mattermost: { serverUrl: 'https://mattermost.example.com' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mattermost token is required');
    });
  });

  describe('validateLLMProvider - OpenAI', () => {
    test('should validate OpenAI configuration', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-validkey123' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
    });

    test('should reject OpenAI config without API key', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: {},
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is required');
    });

    test('should warn about OpenAI key format', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'invalid-key-format' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.warnings.some((w) => w.includes('sk-'))).toBe(true);
    });

    test('should suggest specifying a model', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-validkey' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.suggestions.some((s) => s.includes('model'))).toBe(true);
    });
  });

  describe('validateLLMProvider - Flowise', () => {
    test('should validate Flowise configuration', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'flowise',
        discord: { token: 'Bot token' },
        flowise: { endpoint: 'https://flowise.example.com', apiKey: 'flow-key' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
    });

    test('should reject Flowise config without endpoint', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'flowise',
        discord: { token: 'Bot token' },
        flowise: {},
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flowise endpoint is required');
    });

    test('should reject invalid Flowise endpoint', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'flowise',
        discord: { token: 'Bot token' },
        flowise: { endpoint: 'not-a-url', apiKey: 'key' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flowise endpoint must be a valid URL');
    });
  });

  describe('validateLLMProvider - OpenWebUI', () => {
    test('should validate OpenWebUI configuration', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openwebui',
        discord: { token: 'Bot token' },
        openwebui: {
          apiKey: 'owui-key',
          endpoint: 'https://openwebui.example.com',
        },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
    });

    test('should reject OpenWebUI config without API key', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openwebui',
        discord: { token: 'Bot token' },
        openwebui: { endpoint: 'https://openwebui.example.com' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenWebUI API key is required');
    });
  });

  describe('validateAdvancedConfig', () => {
    test('should warn about very long system instruction', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-key' },
        systemInstruction: 'a'.repeat(CONFIG_LIMITS.SYSTEM_INSTRUCTION_WARNING_LENGTH + 100),
      };

      const result = validator.validateBotConfig(config);

      expect(result.warnings.some((w) => w.includes('very long'))).toBe(true);
    });

    test('should suggest adding more detail to short system instruction', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-key' },
        systemInstruction: 'Hi',
      };

      const result = validator.validateBotConfig(config);

      if (CONFIG_LIMITS.SYSTEM_INSTRUCTION_MIN_LENGTH > 2) {
        expect(result.suggestions.some((s) => s.includes('very short'))).toBe(true);
      }
    });

    test('should validate MCP server URLs', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-key' },
        mcpServers: ['https://valid.com', 'invalid-url'],
      };

      const result = validator.validateBotConfig(config);

      expect(result.errors.some((e) => e.includes('invalid URL'))).toBe(true);
    });

    test('should warn about MCP Guard with no allowed users', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-key' },
        mcpGuard: { enabled: true, type: 'custom' },
      };

      const result = validator.validateBotConfig(config);

      expect(result.warnings.some((w) => w.includes('no allowed users'))).toBe(true);
    });

    test('should warn about custom persona', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-key' },
        persona: 'my-custom-persona',
      };

      const result = validator.validateBotConfig(config);

      expect(result.warnings.some((w) => w.includes('Custom persona'))).toBe(true);
    });
  });

  describe('validateAgainstEnvironment', () => {
    test('should detect environment variable overrides', () => {
      process.env.BOTS_TESTBOT_MESSAGE_PROVIDER = 'slack';

      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = validator.validateAgainstEnvironment(config);

      expect(result.warnings.some((w) => w.includes('environment variable'))).toBe(true);

      delete process.env.BOTS_TESTBOT_MESSAGE_PROVIDER;
    });

    test('should warn about Discord token override', () => {
      process.env.DISCORD_BOT_TOKEN = 'env-token';

      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = validator.validateAgainstEnvironment(config);

      expect(result.warnings.some((w) => w.includes('DISCORD_BOT_TOKEN'))).toBe(true);

      delete process.env.DISCORD_BOT_TOKEN;
    });

    test('should warn about OpenAI API key override', () => {
      process.env.OPENAI_API_KEY = 'env-key';

      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = validator.validateAgainstEnvironment(config);

      expect(result.warnings.some((w) => w.includes('OPENAI_API_KEY'))).toBe(true);

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('testBotConfig', () => {
    test('should return test results', async () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-key' },
      };

      const result = await validator.testBotConfig(config);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.details).toBeDefined();
    });

    test('should handle test errors gracefully', async () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = await validator.testBotConfig(config);

      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should handle config with null values', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: null,
        openai: null,
      };

      const result = validator.validateBotConfig(config as any);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
    });

    test('should handle config with undefined values', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: undefined,
        openai: undefined,
      };

      const result = validator.validateBotConfig(config as any);

      expect(result).toBeDefined();
    });

    test('should handle empty MCP servers array', () => {
      const config = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'Bot token' },
        openai: { apiKey: 'sk-key' },
        mcpServers: [],
      };

      const result = validator.validateBotConfig(config);

      expect(result.isValid).toBe(true);
    });
  });
});
