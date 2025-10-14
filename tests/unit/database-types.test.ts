/**
 * Unit tests for database type safety improvements
 */

import {
  DatabaseManager,
  BotConfiguration,
  DiscordConfig,
  SlackConfig,
  OpenAIConfig,
  MCPCGuardConfig,
  ProviderConfig
} from '../../src/database/DatabaseManager';

describe('Database Type Safety', () => {
  describe('Provider Configuration Types', () => {
    test('should accept valid Discord configuration', () => {
      const discordConfig: DiscordConfig = {
        channelId: '123456789',
        guildId: '987654321',
        token: 'bot-token',
        prefix: '!',
        intents: ['GUILDS', 'GUILD_MESSAGES']
      };

      expect(discordConfig.channelId).toBe('123456789');
      expect(discordConfig.intents).toContain('GUILDS');
    });

    test('should accept valid Slack configuration', () => {
      const slackConfig: SlackConfig = {
        botToken: 'xoxb-bot-token',
        appToken: 'xoxp-app-token',
        signingSecret: 'signing-secret',
        teamId: 'T123456789',
        channels: ['C123456789', 'C987654321']
      };

      expect(slackConfig.botToken).toBe('xoxb-bot-token');
      expect(slackConfig.channels).toHaveLength(2);
    });

    test('should accept valid OpenAI configuration', () => {
      const openaiConfig: OpenAIConfig = {
        apiKey: 'sk-test-key',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        organization: 'org-test'
      };

      expect(openaiConfig.apiKey).toBe('sk-test-key');
      expect(openaiConfig.temperature).toBe(0.7);
    });

    test('should accept valid MCP Guard configuration', () => {
      const mcpGuardConfig: MCPCuardConfig = {
        enabled: true,
        type: 'custom',
        allowedUserIds: ['user1', 'user2', 'user3']
      };

      expect(mcpGuardConfig.enabled).toBe(true);
      expect(mcpGuardConfig.allowedUserIds).toHaveLength(3);
    });
  });

  describe('Bot Configuration Types', () => {
    test('should accept valid BotConfiguration with all providers', () => {
      const botConfig: BotConfiguration = {
        name: 'Test Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        persona: 'helpful-assistant',
        systemInstruction: 'You are a helpful assistant',
        mcpServers: [
          { name: 'test-server', serverUrl: 'https://example.com' },
          { name: 'local-server', serverUrl: 'http://localhost:3000' }
        ],
        mcpGuard: {
          enabled: true,
          type: 'custom',
          allowedUserIds: ['user123']
        },
        discord: {
          channelId: '123456789',
          guildId: '987654321',
          token: 'bot-token'
        },
        slack: {
          botToken: 'xoxb-bot-token',
          teamId: 'T123456789'
        },
        mattermost: {
          url: 'https://mattermost.example.com',
          accessToken: 'token123'
        },
        openai: {
          apiKey: 'sk-test-key',
          model: 'gpt-4'
        },
        flowise: {
          apiUrl: 'https://flowise.example.com',
          chatflowId: 'flow-123'
        },
        openwebui: {
          apiUrl: 'https://openwebui.example.com',
          model: 'llama-2'
        },
        openswarm: {
          apiUrl: 'https://openswarm.example.com',
          swarmId: 'swarm-123'
        },
        perplexity: {
          apiKey: 'pplx-test-key'
        },
        replicate: {
          apiKey: 'r8-test-key',
          model: 'model-name',
          version: 'v1.0'
        },
        n8n: {
          apiUrl: 'https://n8n.example.com',
          workflowId: 'workflow-123'
        },
        isActive: true,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        createdBy: 'test-user',
        updatedBy: 'test-user'
      };

      expect(botConfig.name).toBe('Test Bot');
      expect(botConfig.discord?.channelId).toBe('123456789');
      expect(botConfig.mcpGuard?.allowedUserIds).toContain('user123');
      expect(Array.isArray(botConfig.mcpServers)).toBe(true);
    });

    test('should accept BotConfiguration with minimal required fields', () => {
      const minimalConfig: BotConfiguration = {
        name: 'Minimal Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(minimalConfig.name).toBe('Minimal Bot');
      expect(minimalConfig.discord).toBeUndefined();
      expect(minimalConfig.slack).toBeUndefined();
    });

    test('should handle mcpServers as string array', () => {
      const configWithStringArray: BotConfiguration = {
        name: 'String Array Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: ['server1', 'server2'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(Array.isArray(configWithStringArray.mcpServers)).toBe(true);
      expect(configWithStringArray.mcpServers).toContain('server1');
    });

    test('should handle optional provider configurations', () => {
      const configWithSomeProviders: BotConfiguration = {
        name: 'Partial Config Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: {
          channelId: '123456789'
        },
        // Only discord is configured, others should be undefined
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(configWithSomeProviders.discord?.channelId).toBe('123456789');
      expect(configWithSomeProviders.slack).toBeUndefined();
      expect(configWithSomeProviders.openai).toBeUndefined();
    });
  });

  describe('Type Union Safety', () => {
    test('should accept any valid provider config', () => {
      const validConfigs: ProviderConfig[] = [
        {
          channelId: '123456789',
          guildId: '987654321',
          token: 'bot-token'
        },
        {
          botToken: 'xoxb-bot-token',
          teamId: 'T123456789'
        },
        {
          apiKey: 'sk-test-key',
          model: 'gpt-4'
        }
      ];

      expect(validConfigs).toHaveLength(3);
      expect(validConfigs[0]).toHaveProperty('channelId');
      expect(validConfigs[1]).toHaveProperty('botToken');
      expect(validConfigs[2]).toHaveProperty('apiKey');
    });

    test('should maintain type safety for provider-specific fields', () => {
      const processConfig = (config: ProviderConfig): string => {
        if ('channelId' in config) {
          return 'discord';
        } else if ('botToken' in config) {
          return 'slack';
        } else if ('apiKey' in config && 'model' in config) {
          return 'openai';
        }
        return 'unknown';
      };

      expect(processConfig({ channelId: '123' })).toBe('discord');
      expect(processConfig({ botToken: 'xoxb' })).toBe('slack');
      expect(processConfig({ apiKey: 'sk-', model: 'gpt' })).toBe('openai');
    });
  });

  describe('Database Manager Integration', () => {
    test('should work with typed configurations', async () => {
      const dbManager = DatabaseManager.getInstance({
        type: 'sqlite',
        path: ':memory:'
      });

      await dbManager.connect();

      const typedConfig: BotConfiguration = {
        name: 'Typed Test Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: {
          channelId: 'typed-channel',
          token: 'typed-token'
        },
        mcpGuard: {
          enabled: true,
          type: 'owner'
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Should not throw with properly typed configuration
      const configId = await dbManager.createBotConfiguration(typedConfig);
      expect(typeof configId).toBe('number');
      expect(configId).toBeGreaterThan(0);

      // Should retrieve the same typed configuration
      const retrievedConfig = await dbManager.getBotConfiguration(configId);
      expect(retrievedConfig).toBeDefined();
      expect(retrievedConfig!.name).toBe('Typed Test Bot');
      expect(retrievedConfig!.discord?.channelId).toBe('typed-channel');
      expect(retrievedConfig!.mcpGuard?.enabled).toBe(true);

      await dbManager.disconnect();
    });
  });

  describe('Type Safety Validation', () => {
    test('should prevent type errors in provider configs', () => {
      // These should compile without TypeScript errors
      const discordConfig: DiscordConfig = {};
      const slackConfig: SlackConfig = {};
      const openaiConfig: OpenAIConfig = {};
      const mcpGuardConfig: MCPCuardConfig = {
        enabled: true,
        type: 'custom'
      };

      expect(discordConfig).toBeDefined();
      expect(slackConfig).toBeDefined();
      expect(openaiConfig).toBeDefined();
      expect(mcpGuardConfig.enabled).toBe(true);
    });

    test('should validate required fields', () => {
      const mcpGuard: MCPCuardConfig = {
        enabled: true,
        type: 'custom',
        allowedUserIds: ['user1']
      };

      // Required fields should be present
      expect(mcpGuard.enabled).toBeDefined();
      expect(mcpGuard.type).toBeDefined();
      expect(mcpGuard.type).toMatch(/^(owner|custom)$/);
    });
  });
});