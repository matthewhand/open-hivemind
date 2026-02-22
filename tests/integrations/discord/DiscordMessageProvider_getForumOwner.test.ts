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
      fetch: jest.fn().mockImplementation(async (channelId) => {
        if (channelId === 'guild-channel') {
          return {
            isTextBased: () => true,
            isThread: () => false,
            isDMBased: () => false,
            guild: {
              ownerId: 'guild-owner-123',
            },
            messages: {
              fetch: jest.fn().mockResolvedValue(new Map()),
            },
          };
        } else if (channelId === 'thread-channel') {
          return {
            isTextBased: () => true,
            isThread: () => true,
            isDMBased: () => false,
            ownerId: 'thread-owner-456',
            messages: {
              fetch: jest.fn().mockResolvedValue(new Map()),
            },
          };
        }
        return null;
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

  describe('DiscordMessageProvider getForumOwner', () => {
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
          }),
        },
      }));

      const { DiscordService } = require('@hivemind/adapter-discord');
      service = DiscordService.getInstance();
      await service.initialize();

      ({
        DiscordMessageProvider,
      } = require('@hivemind/adapter-discord/providers/DiscordMessageProvider'));

      // Ensure a bot is present
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
      await service.shutdown();
    });

    it('should return guild owner for guild channel', async () => {
      const owner = await provider.getForumOwner('guild-channel');
      expect(owner).toBe('guild-owner-123');
    });

    it('should return thread owner for thread channel', async () => {
      const owner = await provider.getForumOwner('thread-channel');
      expect(owner).toBe('thread-owner-456');
    });

    it('should return fallback for unknown channel', async () => {
      const owner = await provider.getForumOwner('unknown-channel');
      expect(owner).toBe('discord-owner-unknown-channel');
    });
  });
});
