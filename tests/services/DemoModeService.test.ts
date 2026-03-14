/**
 * Tests for DemoModeService
 */

import { DemoModeService } from '../../src/services/DemoModeService';

// Mock the BotConfigurationManager
jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn(() => ({
      getAllBots: jest.fn(() => []),
      getWarnings: jest.fn(() => ['No bot configuration found']),
      isLegacyMode: jest.fn(() => false),
    })),
  },
}));

// Mock UserConfigStore
jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(() => ({
      getBotOverride: jest.fn(() => null),
      isBotDisabled: jest.fn(() => false),
    })),
  },
}));

describe('DemoModeService', () => {
  let demoService: DemoModeService;

  beforeEach(() => {
    // Reset singleton
    (DemoModeService as any).instance = null;
    demoService = DemoModeService.getInstance();
    // Clear environment
    delete process.env.DEMO_MODE;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.OPENAI_API_KEY;
    delete process.env.FLOWISE_API_KEY;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = DemoModeService.getInstance();
      const instance2 = DemoModeService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('detectDemoMode', () => {
    it('should return true when DEMO_MODE is set to true', () => {
      process.env.DEMO_MODE = 'true';
      expect(demoService.detectDemoMode()).toBe(true);
    });

    it('should return false when DEMO_MODE is set to false', () => {
      process.env.DEMO_MODE = 'false';
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return true when no credentials are configured', () => {
      // No env vars set, no bots configured
      expect(demoService.detectDemoMode()).toBe(true);
    });

    it('should return false when DISCORD_BOT_TOKEN is set', () => {
      process.env.DISCORD_BOT_TOKEN = 'valid-discord-bot-token-here';
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return false when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-valid-openai-api-key-here';
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return false when a bot is configured with a real Discord token', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [{ discord: { token: 'valid-discord-bot-token-here' } }],
        getWarnings: () => [],
      });
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return false when a bot is configured with a real Slack token', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [{ slack: { botToken: 'valid-slack-bot-token-here' } }],
        getWarnings: () => [],
      });
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return false when a bot is configured with a real Mattermost token', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [{ mattermost: { token: 'valid-mattermost-bot-token-here' } }],
        getWarnings: () => [],
      });
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return false when a bot is configured with a real OpenAI key', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [{ openai: { apiKey: 'sk-valid-openai-api-key-here' } }],
        getWarnings: () => [],
      });
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return false when a bot is configured with a real Flowise key', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [{ flowise: { apiKey: 'valid-flowise-api-key-here' } }],
        getWarnings: () => [],
      });
      expect(demoService.detectDemoMode()).toBe(false);
    });

    it('should return true when a bot has short/invalid credentials', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [
          {
            discord: { token: 'short' },
            slack: { botToken: 'short' },
            mattermost: { token: 'short' },
            openai: { apiKey: 'short' },
            flowise: { apiKey: 'short' },
          },
        ],
        getWarnings: () => ['No bot configuration found'],
      });
      expect(demoService.detectDemoMode()).toBe(true);
    });

    it('should return true when no bots are configured at all', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [],
        getWarnings: () => ['No bot configuration found'],
      });
      expect(demoService.detectDemoMode()).toBe(true);
    });

    it('should continue checking bots and return false if at least one has valid credentials', () => {
      const { BotConfigurationManager } = require('../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance.mockReturnValueOnce({
        getAllBots: () => [
          { discord: { token: 'short' } }, // too short — not valid
          { openai: { apiKey: 'valid-openai-api-key' } }, // valid
        ],
        getWarnings: () => [],
      });
      expect(demoService.detectDemoMode()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should create demo bots when in demo mode', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();

      const bots = demoService.getDemoBots();
      expect(bots.length).toBeGreaterThan(0);
      expect(bots[0].isDemo).toBe(true);
    });

    it('should not create demo bots when not in demo mode', () => {
      process.env.DEMO_MODE = 'false';
      demoService.initialize();

      const bots = demoService.getDemoBots();
      expect(bots.length).toBe(0);
    });
  });

  describe('isInDemoMode', () => {
    it('should return true after initialization in demo mode', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();
      expect(demoService.isInDemoMode()).toBe(true);
    });
  });

  describe('generateDemoResponse', () => {
    it('should return a response for greetings', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();

      const response = demoService.generateDemoResponse('Hello!', 'Demo Bot');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return a response for help requests', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();

      const response = demoService.generateDemoResponse('Help me!', 'Demo Bot');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return a default response for unknown messages', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();

      const response = demoService.generateDemoResponse('Random message', 'Demo Bot');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return a response for configuration questions', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();

      const response = demoService.generateDemoResponse('How do I config this?', 'Demo Bot');
      expect(typeof response).toBe('string');
      expect(response).toMatch(/configure/i);
    });

    it('should return a response for feature questions', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();

      const response = demoService.generateDemoResponse('What features do you have?', 'Demo Bot');
      expect(typeof response).toBe('string');
      expect(response).toMatch(/capabilities/i);
    });
  });

  describe('conversation management', () => {
    it('should create a new conversation', () => {
      const conversation = demoService.getOrCreateConversation('channel-1', 'Demo Bot');
      expect(conversation.channelId).toBe('channel-1');
      expect(conversation.botName).toBe('Demo Bot');
      expect(conversation.messages).toEqual([]);
    });

    it('should return the same conversation instance on repeated calls', () => {
      const conv1 = demoService.getOrCreateConversation('channel-1', 'Demo Bot');
      const conv2 = demoService.getOrCreateConversation('channel-1', 'Demo Bot');
      expect(conv1).toBe(conv2);
    });

    it('should add messages to conversation', () => {
      const message = demoService.addMessage('channel-1', 'Demo Bot', 'Hello!', 'incoming');

      expect(message.content).toBe('Hello!');
      expect(message.type).toBe('incoming');
      expect(message.isDemo).toBe(true);
    });

    it('should return conversation history', () => {
      demoService.addMessage('channel-1', 'Demo Bot', 'Hello!', 'incoming');
      demoService.addMessage('channel-1', 'Demo Bot', 'Hi there!', 'outgoing');

      const history = demoService.getConversationHistory('channel-1', 'Demo Bot');
      expect(history.length).toBe(2);
    });

    it('should return empty history for a non-existent conversation', () => {
      const history = demoService.getConversationHistory('no-such-channel', 'Demo Bot');
      expect(history).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should clear all conversations', () => {
      demoService.addMessage('channel-1', 'Demo Bot', 'Hello!', 'incoming');
      demoService.reset();

      const conversations = demoService.getAllConversations();
      expect(conversations.length).toBe(0);
    });
  });

  describe('getDemoStatus', () => {
    it('should return status information', () => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();

      const status = demoService.getDemoStatus();
      expect(status).toHaveProperty('isDemoMode');
      expect(status).toHaveProperty('botCount');
      expect(status).toHaveProperty('conversationCount');
      expect(status).toHaveProperty('messageCount');
    });

    it('should calculate correct messageCount across multiple conversations', () => {
      demoService.addMessage('channel-1', 'Demo Bot', 'msg 1', 'incoming');
      demoService.addMessage('channel-1', 'Demo Bot', 'msg 2', 'outgoing');
      demoService.addMessage('channel-2', 'Demo Bot', 'msg 3', 'incoming');

      const status = demoService.getDemoStatus();
      expect(status.conversationCount).toBe(2);
      expect(status.messageCount).toBe(3);
    });
  });

  describe('Edge Cases and Concurrency', () => {
    beforeEach(() => {
      process.env.DEMO_MODE = 'true';
      demoService.initialize();
    });

    it('should handle empty/null/undefined inputs in generateDemoResponse', () => {
      expect(demoService.generateDemoResponse('', 'Bot')).toBeDefined();
      expect(() => demoService.generateDemoResponse(null as any, 'Bot')).toThrow();
      expect(() => demoService.generateDemoResponse(undefined as any, 'Bot')).toThrow();
    });

    it('should handle extremely long messages', () => {
      const longMessage = 'a'.repeat(10000);
      const response = demoService.generateDemoResponse(longMessage, 'Demo Bot');
      expect(response).toBeDefined();

      const addedMsg = demoService.addMessage('channel-1', 'Demo Bot', longMessage, 'incoming');
      expect(addedMsg.content).toBe(longMessage);
    });

    it('should handle concurrent addMessage calls safely', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              demoService.addMessage('channel-1', 'Demo Bot', `Message ${i}`, 'incoming');
              resolve();
            }, Math.random() * 10);
          })
        );
      }
      await Promise.all(promises);

      const history = demoService.getConversationHistory('channel-1', 'Demo Bot');
      expect(history.length).toBe(100);
    });
  });
});
