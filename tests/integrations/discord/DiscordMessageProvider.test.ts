jest.mock('discord.js', () => {
  const mockClient = {
    on: jest.fn(),
    login: jest.fn().mockResolvedValue(undefined),
    channels: {
      fetch: jest.fn().mockResolvedValue({
        isTextBased: jest.fn().mockReturnValue(true),
        messages: { fetch: jest.fn().mockResolvedValue(new Map([['1', { content: 'Test message from Discord', id: '1' }]])) },
      }),
    },
    user: { id: 'bot1', tag: 'Bot1#1234' },
  };
  return {
    Client: jest.fn(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildVoiceStates: 8,
    },
    TextChannel: jest.fn(),
    ThreadChannel: jest.fn(),
  };
});

const ProviderModule = require('@integrations/discord/providers/DiscordMessageProvider');
const SvcModule = require('@integrations/discord/DiscordService');

describe('DiscordMessageProvider', () => {
  let testProvider: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.DISCORD_BOT_TOKEN = 'token1';
    SvcModule.DiscordService.instance = undefined;

    testProvider = new ProviderModule.DiscordMessageProvider();
    await SvcModule.DiscordService.getInstance().initialize();
  });

  afterEach(() => {
    SvcModule.DiscordService.instance = undefined;
  });

  it('should fetch messages from DiscordService', async () => {
    const messages = await testProvider.getMessages('test-channel');
    expect(messages).toHaveLength(1);
    expect(messages[0].getText()).toBe('Test message from Discord');
  });
});
