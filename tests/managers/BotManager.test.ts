import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';
import { SecureConfigManager } from '../../src/config/SecureConfigManager';
import { UserConfigStore } from '../../src/config/UserConfigStore';
import { BotInstance, BotManager } from '../../src/managers/BotManager';
import * as ProviderRegistry from '../../src/message/ProviderRegistry';
import { webUIStorage } from '../../src/storage/webUIStorage';

// Mock dependencies
jest.mock('fs');
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
  };
});

jest.mock('../../src/config/BotConfigurationManager');
jest.mock('../../src/config/SecureConfigManager');
jest.mock('../../src/config/UserConfigStore');
jest.mock('../../src/storage/webUIStorage');
jest.mock('../../src/message/ProviderRegistry', () => ({
  getMessengerServiceByProvider: jest.fn(),
}));
jest.mock('../../src/utils/envUtils', () => ({
  checkBotEnvOverrides: jest.fn().mockReturnValue({}),
}));

describe('BotManager', () => {
  let botManager: BotManager;
  let mockBotConfigManager: any;
  let mockSecureConfigManager: any;
  let mockUserConfigStore: any;
  let mockMessengerService: any;

  // BotInstance shape
  const mockBotInstance: BotInstance = {
    id: 'test-bot-id',
    name: 'Test Bot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    isActive: false,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    config: {
      discord: { token: 'test-token' },
      openai: { apiKey: 'test-key' },
    },
    persona: 'default',
    systemInstruction: 'You are a bot',
    mcpServers: [],
    mcpGuard: { enabled: false, type: 'owner' },
  };

  // BotConfig shape (flat structure)
  const mockBotConfig = {
    name: 'Configured Bot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    discord: { token: 'test-token' },
    openai: { apiKey: 'test-key' },
    persona: 'default',
    systemInstruction: 'You are a bot',
    mcpServers: [],
    mcpGuard: { enabled: false, type: 'owner' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockBotConfigManager = {
      getAllBots: jest.fn().mockReturnValue([]),
      cloneBot: jest.fn(),
      deleteBot: jest.fn(),
    };
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockBotConfigManager);

    mockSecureConfigManager = {
      storeConfig: jest.fn(),
      getConfig: jest.fn(),
      deleteConfig: jest.fn(),
    };
    (SecureConfigManager.getInstance as jest.Mock).mockReturnValue(mockSecureConfigManager);

    mockUserConfigStore = {
      setBotDisabled: jest.fn(),
    };
    (UserConfigStore.getInstance as jest.Mock).mockReturnValue(mockUserConfigStore);

    mockMessengerService = {
      addBot: jest.fn(),
      disconnectBot: jest.fn(),
      removeBot: jest.fn(),
      sendMessageToChannel: jest.fn(),
      getMessagesFromChannel: jest.fn().mockResolvedValue([]),
      getDefaultChannel: jest.fn().mockReturnValue('general'),
    };
    (ProviderRegistry.getMessengerServiceByProvider as jest.Mock).mockResolvedValue(
      mockMessengerService
    );

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue('{}');
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    // Reset singleton instance
    (BotManager as any).instance = undefined;
    botManager = new BotManager();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = BotManager.getInstance();
      const instance2 = BotManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should load custom bots from file if exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const customBotsData = {
        'custom-bot-1': { ...mockBotInstance, id: 'custom-bot-1', name: 'Custom Bot 1' },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(customBotsData));

      const newManager = new BotManager();

      expect(fs.readFileSync).toHaveBeenCalled();
    });
  });

  describe('getAllBots', () => {
    it('should combine configured bots and custom bots', async () => {
      // Mock configured bots
      const configuredBot = { ...mockBotConfig, name: 'Configured Bot' };
      mockBotConfigManager.getAllBots.mockReturnValue([configuredBot]);

      // Mock custom bots
      const customBot = { ...mockBotInstance, id: 'custom-bot', name: 'Custom Bot' };
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([customBot]);

      const bots = await botManager.getAllBots();

      expect(bots).toHaveLength(2);
      expect(bots.some((b) => b.id === 'Configured Bot')).toBeTruthy();
      expect(bots.some((b) => b.id === 'custom-bot')).toBeTruthy();
    });

    it('should prioritize custom bots over configured bots with same ID', async () => {
      const configuredBot = { ...mockBotConfig, name: 'Configured Name' };
      mockBotConfigManager.getAllBots.mockReturnValue([configuredBot]);

      // Custom bot with same ID as configured bot (configured bot ID = name)
      const customBot = { ...mockBotInstance, id: 'Configured Name', name: 'Custom Bot Override' };
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([customBot]);

      const bots = await botManager.getAllBots();

      expect(bots).toHaveLength(1);
      expect(bots[0].name).toBe('Custom Bot Override');
    });
  });

  describe('getBot', () => {
    it('should retrieve a bot by ID', async () => {
      const customBot = { ...mockBotInstance, id: 'custom-bot', name: 'Custom Bot' };
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([customBot]);

      const bot = await botManager.getBot('custom-bot');
      expect(bot).toBeDefined();
      expect(bot?.id).toBe('custom-bot');
    });

    it('should return null if bot not found', async () => {
      mockBotConfigManager.getAllBots.mockReturnValue([]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([]);

      const bot = await botManager.getBot('non-existent');
      expect(bot).toBeNull();
    });
  });

  describe('createBot', () => {
    const createRequest = {
      name: 'New Bot',
      messageProvider: 'discord' as const,
      llmProvider: 'openai' as const,
      config: {
        discord: { token: 'new-token' },
        openai: { apiKey: 'new-key' },
      },
    };

    it('should create a new bot successfully', async () => {
      const bot = await botManager.createBot(createRequest);

      expect(bot.name).toBe(createRequest.name);
      expect(bot.id).toBeDefined();
      expect(webUIStorage.saveAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createRequest.name,
          id: bot.id,
        })
      );
      expect(mockSecureConfigManager.storeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `bot_${bot.id}`,
          type: 'bot',
        })
      );
    });

    it('should throw error if name is missing', async () => {
      await expect(botManager.createBot({ ...createRequest, name: '' })).rejects.toThrow(
        'Bot name is required'
      );
    });
  });

  describe('updateBot', () => {
    it('should throw error if bot is not found', async () => {
      mockBotConfigManager.getAllBots.mockReturnValue([]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([]);

      await expect(botManager.updateBot('non-existent', { name: 'UpdatedName' })).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('startBot', () => {
    it('should start a bot successfully', async () => {
      const botToStart = { ...mockBotInstance, isActive: false };

      mockBotConfigManager.getAllBots.mockReturnValue([]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([botToStart]);

      mockSecureConfigManager.getConfig.mockResolvedValue({ data: botToStart.config });

      await botManager.startBot(botToStart.id);

      expect(mockUserConfigStore.setBotDisabled).toHaveBeenCalledWith(botToStart.name, false);
      expect(mockMessengerService.addBot).toHaveBeenCalled();
    });
  });

  describe('stopBot', () => {
    it('should stop a bot successfully', async () => {
      const botToStop = { ...mockBotInstance, isActive: true };

      mockBotConfigManager.getAllBots.mockReturnValue([]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([botToStop]);
      mockSecureConfigManager.getConfig.mockResolvedValue({ data: botToStop.config });

      await botManager.startBot(botToStop.id);

      await botManager.stopBot(botToStop.id);

      expect(mockUserConfigStore.setBotDisabled).toHaveBeenCalledWith(botToStop.name, true);
      expect(mockMessengerService.disconnectBot).toHaveBeenCalled();
    });
  });

  describe('cloneBot', () => {
    it('should clone a custom bot', async () => {
      const sourceBot = { ...mockBotInstance, id: 'source-id', name: 'Source Bot' };
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([sourceBot]);

      const clonedBot = await botManager.cloneBot('source-id', 'Cloned Bot');

      expect(clonedBot.name).toBe('Cloned Bot');
      expect(clonedBot.id).not.toBe('source-id');
      expect(webUIStorage.saveAgent).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should perform health check on running bots', async () => {
      const bot = { ...mockBotInstance, isActive: true };
      mockBotConfigManager.getAllBots.mockReturnValue([]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([bot]);
      mockSecureConfigManager.getConfig.mockResolvedValue({ data: bot.config });

      await botManager.startBot(bot.id);

      const health = await botManager.performHealthCheck();

      expect(health).toHaveLength(1);
      expect(health[0].botId).toBe(bot.id);
      expect(health[0].status).toBe('healthy');
    });
  });

  describe('Batch Operations', () => {
    it('should start all configured bots', async () => {
      const bot1 = { ...mockBotConfig, name: 'Bot 1' };

      mockBotConfigManager.getAllBots.mockReturnValue([bot1]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([]);
      mockSecureConfigManager.getConfig.mockResolvedValue({ data: {} });

      await botManager.startAllConfiguredBots();

      expect(mockMessengerService.addBot).toHaveBeenCalledTimes(1);
    });

    it('should stop all configured bots', async () => {
      const bot1 = { ...mockBotConfig, name: 'Bot 1' };

      mockBotConfigManager.getAllBots.mockReturnValue([bot1]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([]);
      mockSecureConfigManager.getConfig.mockResolvedValue({ data: {} });

      await botManager.startBot('Bot 1');

      await botManager.stopAllConfiguredBots();

      expect(mockMessengerService.disconnectBot).toHaveBeenCalled();
    });
  });

  describe('getBotHistory', () => {
    it('should return bot history', async () => {
      const bot = { ...mockBotConfig, name: 'Bot 1' };
      mockBotConfigManager.getAllBots.mockReturnValue([bot]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([]);

      const history = await botManager.getBotHistory('Bot 1', 'channel-id');

      expect(mockMessengerService.getMessagesFromChannel).toHaveBeenCalledWith('channel-id', 20);
      expect(history).toEqual([]);
    });

    it('should use default channel if not provided', async () => {
      const bot = {
        ...mockBotConfig,
        name: 'Bot 1',
        discord: { ...mockBotConfig.discord, defaultChannelId: 'default-channel' },
      };
      mockBotConfigManager.getAllBots.mockReturnValue([bot]);
      (webUIStorage.getAgents as jest.Mock).mockReturnValue([]);

      await botManager.getBotHistory('Bot 1');

      expect(mockMessengerService.getMessagesFromChannel).toHaveBeenCalledWith(
        'default-channel',
        20
      );
    });
  });
});
