jest.isolateModules(() => {
  jest.mock('discord.js', () => ({
    Client: jest.fn(() => ({
      on: jest.fn(),
      login: jest.fn().mockResolvedValue(undefined),
      channels: {
        fetch: jest.fn().mockResolvedValue({
          isTextBased: jest.fn().mockReturnValue(true),
          messages: {
            fetch: jest.fn().mockResolvedValue(new Map([['1', { content: 'Test message from Discord', id: '1' }]])),
          },
        }),
      },
      user: { id: 'bot1', tag: 'Madgwick AI#1234' },
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

  jest.mock('@integrations/discord/DiscordMessage', () => {
    return jest.fn().mockImplementation((msg) => ({
      getText: () => msg.content,
      isFromBot: () => false,
    }));
  });

  describe('DiscordMessageProvider', () => {
    let testProvider: any;
    let service: any;

    beforeEach(async () => {
      jest.clearAllMocks();

      delete process.env.DISCORD_USERNAME_OVERRIDE;
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.DISCORD_BOT_TOKEN = 'token1';

      const { Discord } = require('@integrations/discord/DiscordService');
      const { DiscordMessageProvider } = require('@integrations/discord/providers/DiscordMessageProvider');
      (Discord.DiscordService as any).instance = undefined;
      service = Discord.DiscordService.getInstance();
      await service.initialize();
      testProvider = new DiscordMessageProvider();
    });

    afterEach(async () => {
      if (service) await service.shutdown();
    });

    it('should fetch messages from DiscordService', async () => {
      const messages = await testProvider.getMessages('test-channel');
      expect(messages).toHaveLength(1);
      expect(messages[0].getText()).toBe('Test message from Discord');
    });
  });
});
