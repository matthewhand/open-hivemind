jest.isolateModules(() => {
  jest.mock('discord.js', () => ({
    Client: jest.fn(() => ({
      on: jest.fn(),
      login: jest.fn().mockResolvedValue(undefined),
      user: { id: 'bot1', tag: 'Madgwick AI#1234' },
      destroy: jest.fn(),
    })),
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

    beforeEach(async () => {
      jest.clearAllMocks();

      delete process.env.DISCORD_USERNAME_OVERRIDE;
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.DISCORD_BOT_TOKEN = 'token1';

      const { Discord } = require('@integrations/discord/DiscordService');
      (Discord.DiscordService as any).instance = undefined;
      service = Discord.DiscordService.getInstance();
    });

    afterEach(async () => {
      if (service) await service.shutdown();
    });

    it('initializes correctly', async () => {
      await service.initialize();
      expect(service.getAllBots()).toHaveLength(1);
      expect(service.getAllBots()[0].client.login).toHaveBeenCalledWith('token1');
    });
  });
});
