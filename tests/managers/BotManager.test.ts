import 'reflect-metadata';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';
import { BotManager } from '../../src/managers/BotManager';
import { webUIStorage } from '../../src/storage/webUIStorage';

jest.mock('../../src/config/BotConfigurationManager');
jest.mock('../../src/config/ProviderConfigManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getMessageProviderIdForBot: jest.fn(),
      getLlmProviderIdForBot: jest.fn(),
    })),
  },
}));
jest.mock('../../src/config/SecureConfigManager', () => ({
  SecureConfigManager: {
    getInstanceSync: jest.fn(() => ({
      storeConfig: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));
jest.mock('../../src/storage/webUIStorage');

describe('BotManager', () => {
  let manager: BotManager;
  let mockBotConfigManager: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockBotConfigManager = {
      getAllBots: jest.fn().mockReturnValue([]),
      getBot: jest.fn().mockReturnValue(null),
    };
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockBotConfigManager);

    (webUIStorage.getAgents as jest.Mock).mockResolvedValue([]);

    // Reset singleton
    (BotManager as any).instance = undefined;
    manager = await BotManager.getInstance();
  });

  it('should be a singleton', async () => {
    const s2 = await BotManager.getInstance();
    expect(manager).toBe(s2);
  });

  describe('getAllBots', () => {
    it('should combine configured and custom bots', async () => {
      const configuredBot = { name: 'conf-1', messageProvider: 'discord', llmProvider: 'openai' };
      const customBot = { id: 'cust-1', name: 'Custom 1', messageProvider: 'slack' };

      mockBotConfigManager.getAllBots.mockReturnValue([configuredBot]);
      (webUIStorage.getAgents as jest.Mock).mockResolvedValue([customBot]);

      const allBots = await manager.getAllBots();

      expect(allBots).toHaveLength(2);
      expect(allBots.some((b) => b.name === 'conf-1')).toBe(true);
      expect(allBots.some((b) => b.id === 'cust-1')).toBe(true);
    });
  });

  describe('getBot', () => {
    it('should find bot in configured bots', async () => {
      const configuredBot = { name: 'bot-1', messageProvider: 'd', llmProvider: 'o' };
      mockBotConfigManager.getBot.mockReturnValue(configuredBot);

      const bot = await manager.getBot('bot-1');
      expect(bot).not.toBeNull();
      expect(bot?.name).toBe('bot-1');
    });

    it('should return null if bot not found', async () => {
      const bot = await manager.getBot('non-existent');
      expect(bot).toBeNull();
    });
  });

  describe('createBot', () => {
    it('should create and save a new bot', async () => {
      const request = {
        name: 'New Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner' as const, allowedUserIds: [] },
      };

      (webUIStorage.saveAgent as jest.Mock).mockResolvedValue(undefined);

      const bot = await manager.createBot(request);

      expect(bot.name).toBe('New Bot');
      expect(webUIStorage.saveAgent).toHaveBeenCalled();
    });
  });
});
