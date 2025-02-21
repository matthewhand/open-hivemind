import { DiscordService } from '@integrations/discord/DiscordService';
import { Client, GatewayIntentBits } from 'discord.js';
import { handleMessage } from '@message/handlers/messageHandler';

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    channels: { fetch: jest.fn().mockResolvedValue({ isTextBased: () => true, send: jest.fn() }) },
    user: { id: 'test-id', tag: 'TestBot#1234' },
    on: jest.fn(), // Mockable 'on' method on instance
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildVoiceStates: 8,
  },
}));

jest.mock('@message/handlers/messageHandler', () => ({
  handleMessage: jest.fn().mockResolvedValue('Mocked response'),
}));

describe('DiscordService Multi-Bot Functionality', () => {
  let discordService: DiscordService;

  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = 'token1,token2';
    process.env.DISCORD_USERNAME_OVERRIDE = 'Agent1,Agent2';
    (DiscordService as any).instance = undefined;
    jest.clearAllMocks();
    discordService = DiscordService.getInstance();
  });

  afterEach(() => {
    (DiscordService as any).instance = undefined;
  });

  it('initializes multiple bots', async () => {
    await discordService.initialize();
    const bots = discordService['bots']; // Access private for test
    expect(bots.length).toBe(2);
    expect(bots[0].botUserName).toBe('Agent1');
    expect(bots[1].botUserName).toBe('Agent2');
    expect(bots[0].client.login).toHaveBeenCalledWith('token1');
    expect(bots[1].client.login).toHaveBeenCalledWith('token2');
  });

  it('sendMessageToChannel uses correct bot based on senderName', async () => {
    await discordService.initialize();
    const channelId = '123456789';
    await discordService.sendMessageToChannel(channelId, 'Hello', 'Agent2');
    const bot = discordService['bots'].find(b => b.botUserName === 'Agent2')!;
    expect(bot.client.channels.fetch).toHaveBeenCalledWith(channelId);
  });

  it('messageCreate event filters bot messages and routes valid messages', async () => {
    await discordService.initialize();
    const mockMessage = { author: { bot: false }, content: 'Hi', channelId: '123' };
    const bot = discordService['bots'][0];
    const messageHandler = (bot.client.on as jest.Mock).mock.calls.find((call: [string, Function]) => call[0] === 'messageCreate')![1];
    await messageHandler(mockMessage);
    expect(handleMessage).toHaveBeenCalledWith(expect.anything(), expect.any(Array));
  });

  it('shutdown destroys all bot clients', async () => {
    await discordService.initialize();
    await discordService.shutdown();
    for (const bot of discordService['bots']) {
      expect(bot.client.destroy).toHaveBeenCalled();
    }
    expect((DiscordService as any).instance).toBeUndefined();
  });
});
