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

  jest.mock('@config/BotConfigurationManager', () => ({
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([
        {
          name: 'TestBot',
          messageProvider: 'discord',
          discord: {
            token: 'token1',
          },
        },
      ]),
    }),
  }));

  describe('DiscordService', () => {
    let service: any;

    beforeEach(async () => {
      jest.clearAllMocks();

      delete process.env.DISCORD_USERNAME_OVERRIDE;
      delete process.env.DISCORD_BOT_TOKEN;

      const BotConfigurationManager = require('@config/BotConfigurationManager');
      const mockGetInstance = BotConfigurationManager.getInstance;
      mockGetInstance.mockReturnValue({
        getAllBots: jest.fn().mockReturnValue([
          {
            name: 'TestBot',
            messageProvider: 'discord',
            discord: {
              token: 'token1',
            },
          },
        ]),
        getWarnings: jest.fn().mockReturnValue([]),
        isLegacyMode: jest.fn().mockReturnValue(false),
      });

      const { DiscordService } = require('@integrations/discord/DiscordService');
      (DiscordService as any).instance = undefined;
      service = DiscordService.getInstance();
    });

    afterEach(async () => {
      if (service) await service.shutdown();
    });

    it('initializes correctly', async () => {
      await service.initialize();
      expect(service.getAllBots()).toHaveLength(1);
      expect(service.getAllBots()[0].client.login).toHaveBeenCalledWith('token1');
    });

    it('shuts down correctly', async () => {
      await service.initialize();
      await service.shutdown();
      expect(mockClient.destroy).toHaveBeenCalled();
    });
  });
});
