const mockChannel = {
  isTextBased: jest.fn().mockReturnValue(true),
  send: jest.fn().mockResolvedValue({ id: 'msg123' }),
  messages: { fetch: jest.fn().mockResolvedValue(new Map()) },
};

jest.mock('discord.js', () => {
  const mockClient = {
    on: jest.fn(),
    login: jest.fn().mockResolvedValue(undefined),
    channels: {
      fetch: jest.fn().mockResolvedValue(mockChannel),
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

jest.mock('@message/interfaces/messageConfig', () => ({
  get: jest.fn().mockReturnValue(false),
}));

const DiscordSvcModule = require('@integrations/discord/DiscordService');

describe('DiscordService', () => {
  let testService: any;

  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = 'token1';
    process.env.DISCORD_USERNAME_OVERRIDE = 'Bot1';
    process.env.MESSAGE_WAKEWORDS = '!help,!ping';
    DiscordSvcModule.Discord.DiscordService.instance = undefined;
    jest.clearAllMocks();
    testService = DiscordSvcModule.Discord.DiscordService.getInstance();
  });

  afterEach(() => {
    DiscordSvcModule.Discord.DiscordService.instance = undefined;
  });

  it('initializes bot', async () => {
    await testService.initialize();
    const bots = testService.getAllBots();
    expect(bots.length).toBe(1);
    expect(bots[0].botUserName).toBe('Bot1');
    expect(bots[0].client.login).toHaveBeenCalledWith('token1');
  });

  it('sends message to channel without thread', async () => {
    await testService.initialize();
    const messageId = await testService.sendMessageToChannel('123', 'Hello', 'Bot1');
    console.log('Test: Message ID returned:', messageId);
    expect(messageId).toBe('msg123');
    expect(testService.getAllBots()[0].client.channels.fetch).toHaveBeenCalledWith('123');
    expect(mockChannel.send).toHaveBeenCalledWith('*Bot1*: Hello');
  });
});
