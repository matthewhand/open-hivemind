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
  let clientCount = 0;
  const createMockClient = () => {
    clientCount++;
    const mockClient = {
      on: jest.fn(),
      once: jest.fn().mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
      }),
      login: jest.fn().mockResolvedValue(undefined),
      user: { id: `bot${clientCount}`, tag: `Bot${clientCount}#1234` },
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    return mockClient;
  };

  return {
    Client: jest.fn(createMockClient),
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

    it('handles bot and client management scenarios', async () => {
      // Test returns all bots via getAllBots
      await service.initialize();
      let bots = service.getAllBots();
      expect(bots).toHaveLength(1);
      expect(bots[0]).toHaveProperty('client');
      expect(bots[0]).toHaveProperty('botUserId');
      expect(bots[0]).toHaveProperty('botUserName');
      expect(bots[0]).toHaveProperty('config');

      // Test returns client correctly
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client.login).toBeDefined();
      expect(client).toBe(service.getAllBots()[0].client);
    });

    it.each([
      ['empty', { token: '' }],
      ['missing', {}]
    ])('handles %s token validation during initialization', async (type, discordConfig) => {
      mockGetDiscordBotConfigs.mockReturnValue([
        {
          name: 'TestBot1',
          messageProvider: 'discord',
          discord: discordConfig,
          llmProvider: 'flowise',
        },
      ]);

      jest.resetModules();
      DiscordService = require('@integrations/discord/DiscordService').DiscordService;
      service = DiscordService.getInstance();

      await expect(service.initialize()).rejects.toThrow('One or more bot tokens are empty');
    });

    it('sets and handles message handler correctly', async () => {
      await service.initialize();
      const mockHandlerError = jest.fn().mockRejectedValue(new Error('Handler error'));

      service.setMessageHandler(mockHandlerError);

      // Verify that the message handler is stored
      expect((service as any).currentHandler).toBe(mockHandlerError);

      // Verify that event listeners are set up for all bots
      const bot = service.getAllBots()[0];
      const onCalls = bot.client.on.mock.calls;
      const messageCreateCall = onCalls.find((call: any) => call[0] === 'messageCreate');
      expect(messageCreateCall).toBeDefined();
      expect(typeof messageCreateCall[1]).toBe('function');

      const messageCreateHandler = messageCreateCall[1];

      // Test handles errors gracefully
      const mockMessage = {
        author: { bot: false, id: 'user123' },
        channelId: 'channel123',
        content: 'test message',
        guild: { id: 'guild123' },
        channel: { type: 0 },
      };

      await expect(messageCreateHandler(mockMessage)).resolves.not.toThrow();

      // Test ignores bot messages
      const mockBotMessage = {
        author: { bot: true, id: 'bot123' },
        channelId: 'channel123',
        content: 'bot message',
        guild: { id: 'guild123' },
        channel: { type: 0 },
      };

      await messageCreateHandler(mockBotMessage);
      expect(mockHandlerError).not.toHaveBeenCalled();
    });

    it('supports channel prioritization', () => {
      expect(service.supportsChannelPrioritization).toBe(true);
    });

    it('handles configuration and bot management', async () => {
      // Test legacy configuration with comma-separated tokens
      process.env.DISCORD_BOT_TOKEN = 'token1,token2';
      mockGetDiscordBotConfigs.mockReturnValue([]);
      jest.resetModules();
      DiscordService = require('@integrations/discord/DiscordService').DiscordService;
      service = DiscordService.getInstance();
      let bots = service.getAllBots();
      expect(bots).toHaveLength(2);
      expect(bots[0].config.token).toBe('token1');
      expect(bots[1].config.token).toBe('token2');
      delete process.env.DISCORD_BOT_TOKEN;

      // Reset mocks and test adding bot successfully
      jest.clearAllMocks();
      mockGetDiscordBotConfigs.mockReturnValue([{
        name: 'TestBot1',
        messageProvider: 'discord',
        discord: { token: 'test_token_1' },
        llmProvider: 'flowise',
      }]);
      jest.resetModules();
      DiscordService = require('@integrations/discord/DiscordService').DiscordService;
      service = DiscordService.getInstance();
      await service.initialize();

      const initialBotCount = service.getAllBots().length;

      await service.addBot({
        name: 'NewBot',
        discord: { token: 'new_token' },
        llmProvider: 'openai'
      });

      expect(service.getAllBots()).toHaveLength(initialBotCount + 1);
      const newBot = service.getAllBots()[service.getAllBots().length - 1];
      expect(newBot.botUserName).toBe('NewBot');
      expect(newBot.config.token).toBe('new_token');
    });

    it.each([
      ['without token', {}],
      ['with empty token', { token: '' }]
    ])('throws error when adding bot %s', async (desc, discord) => {
      await service.initialize();

      await expect(service.addBot({
        name: 'NewBot',
        discord
      })).rejects.toThrow('Discord addBot requires a token');
    });
  });
