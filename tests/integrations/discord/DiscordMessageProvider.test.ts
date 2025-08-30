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
              author: { id: 'test-author', bot: false },
              channelId: 'test-channel',
              mentions: { users: new Map(), roles: new Map(), channels: new Map() },
              attachments: new Map(),
              stickers: new Map(),
              embeds: [],
              reactions: { cache: new Map() },
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

  const { DiscordMessageProvider } = require('@integrations/discord/providers/DiscordMessageProvider');

  describe('DiscordMessageProvider', () => {
    let service: any;
    let provider: any;

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.resetModules();

      jest.mock('@config/BotConfigurationManager', () => ({
        BotConfigurationManager: {
          getInstance: jest.fn().mockReturnValue({
            getDiscordBotConfigs: jest.fn().mockReturnValue([
              {
                name: 'TestBot',
                messageProvider: 'discord',
                discord: {
                  token: 'test-token',
                },
              },
            ]),
            getSlackBotConfigs: jest.fn().mockReturnValue([]),
            getMattermostBotConfigs: jest.fn().mockReturnValue([]),
          }),
        },
      }));

      const { DiscordService } = require('@integrations/discord/DiscordService');
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
