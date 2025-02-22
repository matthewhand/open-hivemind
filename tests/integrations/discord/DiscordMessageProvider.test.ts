jest.mock('@config/messageConfig', () => require('@config/messageConfig'));
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
    user: { id: 'bot1', tag: 'Bot1#1234' },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildVoiceStates: 8,
  },
}));

jest.mock('@config/messageConfig', () => ({
  get: jest.fn().mockImplementation((key) => key === 'DISCORD_MESSAGE_LIMIT' ? 10 : undefined),
}));

jest.mock('@config/messageConfig', () => ({
  get: jest.fn().mockImplementation((key) => key === 'DISCORD_MESSAGE_LIMIT' ? 10 : undefined),
}));

const ProviderModule = require('@integrations/discord/providers/DiscordMessageProvider');
const SvcModule = require('@integrations/discord/DiscordService');
const DiscordMessageMock = require('@integrations/discord/DiscordMessage');

// Mock DiscordMessage as a constructor
jest.mock('@integrations/discord/DiscordMessage', () => {
  return jest.fn().mockImplementation((msg) => ({
    getText: () => msg.content,
    isFromBot: () => false,
  }));
});

describe('DiscordMessageProvider', () => {
  let testProvider: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.DISCORD_BOT_TOKEN = 'token1';
    SvcModule.Discord.DiscordService.instance = undefined;
    testProvider = new ProviderModule.DiscordMessageProvider();
    // Inject the mocked DiscordMessage into the provider
    testProvider.discordSvcLib = { DiscordMessage: DiscordMessageMock };
    await SvcModule.Discord.DiscordService.getInstance().initialize();
  });

  afterEach(() => {
    SvcModule.Discord.DiscordService.instance = undefined;
  });

  it('should fetch messages from DiscordService', async () => {
    const messages = await testProvider.getMessages('test-channel');
    expect(messages).toHaveLength(1);
    expect(messages[0].getText()).toBe('Test message from Discord');
  });
});
