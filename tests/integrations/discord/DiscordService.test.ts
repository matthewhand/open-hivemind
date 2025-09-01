// Hoisted mock for BotConfigurationManager
const mockGetDiscordBotConfigs = jest.fn().mockReturnValue([]);
jest.mock('@config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getDiscordBotConfigs: mockGetDiscordBotConfigs,
      getSlackBotConfigs: jest.fn().mockReturnValue([]),
      getMattermostBotConfigs: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    }),
  },
}));

// Other hoisted mocks
jest.mock('discord.js', () => {
    const mockClient = {
      on: jest.fn(),
      once: jest.fn().mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
      }),
      login: jest.fn().mockResolvedValue(undefined),
      user: { id: 'bot1', tag: 'Madgwick AI#1234' },
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    return {
      Client: jest.fn(() => mockClient),
      GatewayIntentBits: {
        Guilds: 1,
        GuildMessages: 2,
        MessageContent: 4,
        GuildVoiceStates: 8,
      },
    };
  });
  
  jest.mock('@config/messageConfig', () => ({
    default: {
      get: jest.fn((key) => (key === 'MESSAGE_USERNAME_OVERRIDE' ? 'Madgwick AI' : undefined)),
    },
  }));
  
  jest.mock('@config/discordConfig', () => ({
    default: {
      get: jest.fn((key) => (key === 'DISCORD_MESSAGE_HISTORY_LIMIT' ? 10 : undefined)),
    },
  }));
  
  describe('DiscordService', () => {
    let DiscordService: any;
    let service: any;
  
    beforeEach(() => {
      // Configure the mock for this test suite
      mockGetDiscordBotConfigs.mockReturnValue([
        {
          name: 'TestBot1',
          messageProvider: 'discord',
          discord: { token: 'test_token_1' },
          llmProvider: 'flowise',
        },
      ]);

      jest.resetModules();
  
      DiscordService = require('@integrations/discord/DiscordService').DiscordService;
      service = DiscordService.getInstance();
    });
  
    afterEach(async () => {
      if (service) {
        await service.shutdown();
      }
      // Manually reset singletons after each test
      const dsModule = require('@integrations/discord/DiscordService');
      if (dsModule.Discord && dsModule.Discord.DiscordService) {
        dsModule.Discord.DiscordService.instance = undefined;
      }
      const bcmModule = require('@config/BotConfigurationManager');
      if (bcmModule.BotConfigurationManager) {
        bcmModule.BotConfigurationManager.instance = undefined;
      }
      // Clear mock implementation
      mockGetDiscordBotConfigs.mockClear();
    });
  
    it('initializes correctly', async () => {
      await service.initialize();
      expect(service.getAllBots()).toHaveLength(1);
      const bot = service.getAllBots()[0];
      expect(bot.botUserName).toBe('TestBot1');
      expect(bot.client.login).toHaveBeenCalledWith('test_token_1');
    });
  
    it('shuts down correctly', async () => {
      await service.initialize();
      const bot = service.getAllBots()[0];
      await service.shutdown();
      expect(bot.client.destroy).toHaveBeenCalled();
    });
  });
