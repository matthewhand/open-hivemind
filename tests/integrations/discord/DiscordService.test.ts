jest.isolateModules(() => {
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

  jest.mock('discord.js', () => ({
    Client: jest.fn(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildVoiceStates: 8,
    },
  }));

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
    let service: any;
    let DiscordService: any;

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.resetModules();

      // Mock BotConfigurationManager before it's imported by DiscordService
      jest.mock('@config/BotConfigurationManager', () => ({
        BotConfigurationManager: {
          getInstance: jest.fn().mockReturnValue({
            getDiscordBotConfigs: jest.fn().mockReturnValue([
              {
                name: 'TestBot1',
                messageProvider: 'discord',
                discord: { token: 'test_token_1' },
                llmProvider: 'flowise',
              },
            ]),
            getSlackBotConfigs: jest.fn().mockReturnValue([]),
            getMattermostBotConfigs: jest.fn().mockReturnValue([]),
            getWarnings: jest.fn().mockReturnValue([]),
            isLegacyMode: jest.fn().mockReturnValue(false),
          }),
        },
      }));

      DiscordService = require('@integrations/discord/DiscordService').DiscordService;
      service = DiscordService.getInstance();
    });

    afterEach(async () => {
      if (service) await service.shutdown();
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
      await service.shutdown();
      const bot = service.getAllBots()[0];
      expect(bot.client.destroy).toHaveBeenCalled();
    });
  });
});
