jest.isolateModules(() => {
  const mockClient = {
    on: jest.fn(),
    once: jest.fn().mockImplementation((event, callback) => {
      if (event === 'ready') {
        callback();
      }
    }),
    login: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    user: { id: 'bot1', tag: 'Test Bot#1234' },
    channels: {
      fetch: jest.fn().mockResolvedValue({
        messages: {
          fetch: jest.fn().mockResolvedValue(new Map([
            ['123', {
              id: '123',
              content: 'test message',
              author: { id: 'test-author' },
              channelId: 'test-channel',
            }],
          ])),
        },
      }),
    },
  };

  jest.mock('discord.js', () => ({
    Client: jest.fn(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
    },
  }));

  jest.mock('@config/BotConfigurationManager', () => ({
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([
        {
          name: 'TestBot',
          messageProvider: 'discord',
          discord: {
            token: 'test-token',
          },
        },
      ]),
    }),
  }));

  const { DiscordMessageProvider } = require('@integrations/discord/providers/DiscordMessageProvider');

  describe('DiscordMessageProvider', () => {
    let service: any;
    let provider: any;

    beforeEach(async () => {
      jest.clearAllMocks();

      delete process.env.DISCORD_USERNAME_OVERRIDE;
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.DISCORD_BOT_TOKEN = 'token1';

      const { DiscordService } = require('@integrations/discord/DiscordService');
      (DiscordService as any).instance = undefined;
      service = DiscordService.getInstance();
      await service.initialize();
      provider = new DiscordMessageProvider();
    });

    afterEach(async () => {
      await service.shutdown();
    });

    it('should fetch messages from DiscordService', async () => {
      const messages = await provider.getMessages('test-channel');
      expect(messages).toHaveLength(1);
      expect(messages[0].getText()).toBe('test message');
    });
  });
});
