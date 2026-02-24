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
        isTextBased: () => true,
        messages: {
          fetch: jest.fn().mockResolvedValue(
            new Map([
              [
                '123',
                {
                  id: '123',
                  content: 'test message',
                  author: { id: 'test-author', bot: false },
                  channelId: 'test-channel',
                  mentions: { users: new Map(), roles: new Map(), channels: new Map() },
                  attachments: new Map(),
                  stickers: new Map(),
                  embeds: [],
                  reactions: { cache: new Map() },
                },
              ],
            ])
          ),
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

  describe('DiscordMessageProvider', () => {
    let service: any;
    let provider: any;
    let DiscordMessageProvider: any;

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.resetModules();

      jest.mock('@config/UserConfigStore', () => ({
        UserConfigStore: {
          getInstance: jest.fn().mockReturnValue({
            isBotDisabled: jest.fn().mockReturnValue(false),
          }),
        },
      }));

      jest.mock('@config/ProviderConfigManager', () => ({
        __esModule: true,
        default: {
          getInstance: jest.fn().mockReturnValue({
            getAllProviders: jest.fn().mockReturnValue([]),
          }),
        },
      }));

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

      const { DiscordService } = require('@hivemind/adapter-discord');
      service = new DiscordService({
        logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as any,
        messageConfig: { get: jest.fn() } as any,
        discordConfig: { get: jest.fn() } as any,
        errorTypes: { ConfigError: class ConfigError extends Error { } } as any,
      });
      DiscordService.setInstance(service);
      await service.initialize();

      // Load Provider class from the same isolated module context
      ({
        DiscordMessageProvider,
      } = require('@hivemind/adapter-discord/providers/DiscordMessageProvider'));

      // Ensure a bot is present (workaround for CI config loading issues)
      if (service.getAllBots().length === 0) {
        await service.addBot({
          name: 'TestBot',
          discord: { token: 'test-token' },
          token: 'test-token',
        });
      }

      provider = new DiscordMessageProvider();
    });

    afterEach(async () => {
      if (service) await service.shutdown();
    });

    it('should fetch messages from DiscordService', async () => {
      const messages = await provider.getMessages('test-channel');
      expect(messages).toHaveLength(1);
      expect(messages[0].getText()).toBe('test message');
    });
  });
});
