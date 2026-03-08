import { DiscordBotManager } from './DiscordBotManager';

jest.mock('discord.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => {
      return {
        once: jest.fn(),
        login: jest.fn(),
        destroy: jest.fn().mockResolvedValue(true),
        ws: { status: 0, ping: 10 },
        uptime: 1000,
        user: { id: 'bot-id', tag: 'bot#1234', username: 'bot' }
      };
    }),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 512,
      MessageContent: 32768,
      GuildVoiceStates: 128,
    }
  };
});

// Mock dependencies
const mockDeps: any = {
  getAllBotConfigs: () => [],
  isBotDisabled: () => false,
  errorTypes: { ConfigError: class ConfigError extends Error {} },
};

describe('DiscordBotManager', () => {
  let manager: DiscordBotManager;

  beforeEach(() => {
    manager = new DiscordBotManager(mockDeps);
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('addBot and Map sync', () => {
    it('should add bot to array and sync dual-key map', async () => {
      await manager.addBot({ name: 'Bot1', token: 'mock-token', discord: { token: 'mock-token' } });

      const bots = manager.getAllBots();
      expect(bots.length).toBe(1);

      const botByName = manager.getBotByName('Bot1');
      expect(botByName).toBeDefined();
      expect(botByName?.botUserName).toBe('Bot1');
    });
  });

  describe('disconnectBot and Map desync prevention', () => {
    it('should correctly remove bot from both array and map', async () => {
      await manager.addBot({ name: 'Bot2', token: 'mock-token' });

      let botByName = manager.getBotByName('Bot2');
      expect(botByName).toBeDefined();

      const success = await manager.disconnectBot('Bot2');
      expect(success).toBe(true);

      const bots = manager.getAllBots();
      expect(bots.length).toBe(0);

      botByName = manager.getBotByName('Bot2');
      expect(botByName).toBeUndefined();
    });
  });

  describe('isBotConnected', () => {
    it('should accurately use the Map to verify connection status', async () => {
      // Create a mock bot with a specific WS status
      await manager.addBot({ name: 'Bot3', token: 'mock-token' });

      // Force mock ws status 0 (READY)
      const bot = manager.getBotByName('Bot3')!;
      (bot.client.ws as any).status = 0;

      expect(manager.isBotConnected('Bot3')).toBe(true);

      // Change status to disconnected (e.g. 4)
      (bot.client.ws as any).status = 4;
      expect(manager.isBotConnected('Bot3')).toBe(false);

      // Missing bot should return false
      expect(manager.isBotConnected('MissingBot')).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should clear map cache on shutdown', async () => {
      await manager.addBot({ name: 'Bot4', token: 'mock-token' });
      expect(manager.getAllBots().length).toBe(1);

      await manager.shutdown();

      expect(manager.getAllBots().length).toBe(0);
      expect(manager.getBotByName('Bot4')).toBeUndefined();
    });
  });
});
