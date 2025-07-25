import { Discord } from '@integrations/discord/DiscordService';
import { Client, GatewayIntentBits } from 'discord.js';
import messageConfig from '@config/messageConfig';
import discordConfig from '@config/discordConfig';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    once: jest.fn((event, cb) => {
      if (event === 'ready') {
        cb();
      }
    }),
    on: jest.fn(), // Added mock for 'on' method
    login: jest.fn(() => Promise.resolve('mockToken')),
    destroy: jest.fn(),
    channels: {
      fetch: jest.fn(() => Promise.resolve({
        isTextBased: () => true,
        send: jest.fn(() => Promise.resolve({ id: 'mockMessageId' })),
        messages: {
          fetch: jest.fn(() => Promise.resolve(new Map())),
        },
      })),
    },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 1,
    MessageContent: 1,
    GuildVoiceStates: 1,
  },
}));

jest.mock('@config/messageConfig', () => ({
  get: jest.fn((key) => {
    if (key === 'MESSAGE_USERNAME_OVERRIDE') return 'TestBot';
    return undefined;
  }),
}));

jest.mock('@config/discordConfig', () => ({
  get: jest.fn((key) => {
    if (key === 'DISCORD_DEFAULT_CHANNEL_ID') return 'mockDefaultChannelId';
    if (key === 'DISCORD_MESSAGE_HISTORY_LIMIT') return 10;
    return undefined;
  }),
}));

const MockDiscordClient = Client as jest.MockedClass<typeof Client>;

describe('DiscordService', () => {
  let discordService: InstanceType<typeof Discord.DiscordService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set DISCORD_BOT_TOKEN before getting the instance for tests that need it
    process.env.DISCORD_BOT_TOKEN = 'YOUR_BOT_TOKEN_1,YOUR_BOT_TOKEN_2';
    // Reset the singleton instance before each test
    (Discord.DiscordService as any).instance = undefined;
    discordService = Discord.DiscordService.getInstance();
  });

  describe('Token Validation', () => {
    it('should throw error when no tokens are provided via env or config', () => {
      // Create a temporary backup of the config file
      const originalConfig = fs.readFileSync(path.join(__dirname, '../../../config/test/messengers.json'), 'utf-8');
      
      try {
        // Empty the config file
        fs.writeFileSync(path.join(__dirname, '../../../config/test/messengers.json'), JSON.stringify({}));
        delete process.env.DISCORD_BOT_TOKEN;
        (Discord.DiscordService as any).instance = undefined;
        
        expect(() => Discord.DiscordService.getInstance()).toThrow('No Discord bot tokens provided in configuration');
      } finally {
        // Restore the original config
        fs.writeFileSync(path.join(__dirname, '../../../config/test/messengers.json'), originalConfig);
      }
    });

    it('should throw error for empty token in env var list', () => {
      process.env.DISCORD_BOT_TOKEN = 'YOUR_BOT_TOKEN_1,,YOUR_BOT_TOKEN_2';
      (Discord.DiscordService as any).instance = undefined;
      expect(() => Discord.DiscordService.getInstance()).toThrow('Empty token at position 2');
    });

    it('should throw error for empty token in config file', () => {
      const originalConfig = fs.readFileSync(path.join(__dirname, '../../../config/test/messengers.json'), 'utf-8');
      
      try {
        // Modify config to have empty token
        const badConfig = {
          discord: {
            instances: [
              { name: 'BadBot', token: '' }
            ]
          }
        };
        fs.writeFileSync(path.join(__dirname, '../../../config/test/messengers.json'), JSON.stringify(badConfig));
        delete process.env.DISCORD_BOT_TOKEN;
        (Discord.DiscordService as any).instance = undefined;
        
        expect(() => Discord.DiscordService.getInstance()).toThrow('Empty token at position 1 in config file');
      } finally {
        // Restore the original config
        fs.writeFileSync(path.join(__dirname, '../../../config/test/messengers.json'), originalConfig);
      }
    });
  });

  it('should be a singleton', () => {
    const instance1 = Discord.DiscordService.getInstance();
    const instance2 = Discord.DiscordService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize bots with numbered names and log in', async () => {
    await discordService.initialize();

    expect(MockDiscordClient).toHaveBeenCalledTimes(2);
    expect(MockDiscordClient.mock.results[0].value.login).toHaveBeenCalledWith('YOUR_BOT_TOKEN_1');
    expect(MockDiscordClient.mock.results[1].value.login).toHaveBeenCalledWith('YOUR_BOT_TOKEN_2');
    expect(discordService.getAllBots().length).toBe(2);
    expect(discordService.getAllBots()[0].botUserName).toBe('Bot1');
    expect(discordService.getAllBots()[1].botUserName).toBe('Bot2');
  });

  it('should set message handlers on all bots and ignore bot messages', async () => {
    const mockHandler = jest.fn();
    const getMessagesFromChannelSpy = jest.spyOn(discordService, 'getMessagesFromChannel').mockResolvedValue([]);
    discordService.setMessageHandler(mockHandler);
    expect(discordService['handlerSet']).toBe(true);

    // Verify handlers set on both bots
    expect(MockDiscordClient.mock.results[0].value.on).toHaveBeenCalled();
    expect(MockDiscordClient.mock.results[1].value.on).toHaveBeenCalled();

    // Simulate bot messages on both instances
    const mockBotMessage = { author: { bot: true } };
    await MockDiscordClient.mock.results[0].value.on.mock.calls[0][1](mockBotMessage);
    await MockDiscordClient.mock.results[1].value.on.mock.calls[0][1](mockBotMessage);
    expect(mockHandler).not.toHaveBeenCalled();

    // Simulate user messages on both instances
    const mockUserMessage1 = { author: { bot: false }, channelId: 'testChannel1', content: 'user message 1' };
    const mockUserMessage2 = { author: { bot: false }, channelId: 'testChannel2', content: 'user message 2' };
    await MockDiscordClient.mock.results[0].value.on.mock.calls[0][1](mockUserMessage1);
    await MockDiscordClient.mock.results[1].value.on.mock.calls[0][1](mockUserMessage2);
    expect(mockHandler).toHaveBeenCalledTimes(2);

    // Ensure it only sets once
    discordService.setMessageHandler(jest.fn());
    expect(discordService['handlerSet']).toBe(true);

    getMessagesFromChannelSpy.mockRestore();
  });

  it('should send messages using correct bot instance', async () => {
    const mockChannelSend = jest.fn(() => Promise.resolve({ id: 'mockMessageId' }));
    MockDiscordClient.mock.results[0].value.channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      send: mockChannelSend,
    });
    MockDiscordClient.mock.results[1].value.channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      send: mockChannelSend,
    });

    // Send with default bot
    await discordService.sendMessageToChannel('channel123', 'Hello');
    expect(mockChannelSend).toHaveBeenCalledWith('Hello');

    // Send with specific bot name
    await discordService.sendMessageToChannel('channel123', 'Hello 2', 'TestBot #2');
    expect(mockChannelSend).toHaveBeenCalledWith('Hello 2');
  });

  it('should throw error when sending with no bots available', async () => {
    (Discord.DiscordService as any).instance = undefined;
    const emptyService = Discord.DiscordService.getInstance();
    emptyService['bots'] = []; // Force empty bots array
    
    await expect(emptyService.sendMessageToChannel('channel123', 'test'))
      .rejects.toThrow('No Discord bot instances available');
  });

  it('should send message to channel', async () => {
    const mockChannelSend = jest.fn(() => Promise.resolve({ id: 'mockMessageId' }));
    MockDiscordClient.mock.results[0].value.channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      send: mockChannelSend,
    });

    const messageId = await discordService.sendMessageToChannel('channel123', 'Hello');
    expect(messageId).toBe('mockMessageId');
    expect(mockChannelSend).toHaveBeenCalledWith('Hello');
  });

  it('should send message to thread', async () => {
    const mockThreadSend = jest.fn(() => Promise.resolve({ id: 'mockThreadMessageId' }));
    MockDiscordClient.mock.results[0].value.channels.fetch.mockImplementation((id: string) => {
      if (id === 'channel123') return Promise.resolve({ isTextBased: () => true });
      if (id === 'thread456') return Promise.resolve({ isThread: () => true, send: mockThreadSend });
      return Promise.resolve(null);
    });

    const messageId = await discordService.sendMessageToChannel('channel123', 'Hello', undefined, 'thread456');
    expect(messageId).toBe('mockThreadMessageId');
    expect(mockThreadSend).toHaveBeenCalledWith('Hello');
  });

  it('should return empty string if channel not found for sending message', async () => {
    MockDiscordClient.mock.results[0].value.channels.fetch.mockResolvedValue(null);
    const messageId = await discordService.sendMessageToChannel('invalidChannel', 'Hello');
    expect(messageId).toBe('');
  });

  it('should return empty string if thread not found for sending message', async () => {
    MockDiscordClient.mock.results[0].value.channels.fetch.mockImplementation((id: string) => {
      if (id === 'channel123') return Promise.resolve({ isTextBased: () => true });
      if (id === 'invalidThread') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    const messageId = await discordService.sendMessageToChannel('channel123', 'Hello', undefined, 'invalidThread');
    expect(messageId).toBe('');
  });

  it('should fetch messages from channel', async () => {
    const mockMessage = { id: 'msg1', content: 'test' };
    MockDiscordClient.mock.results[0].value.channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      messages: {
        fetch: jest.fn(() => Promise.resolve(new Map([['msg1', mockMessage]]))),
      },
    });

    const messages = await discordService.fetchMessages('channel123');
    expect(messages).toEqual([mockMessage]);
    expect(MockDiscordClient.mock.results[0].value.channels.fetch).toHaveBeenCalledWith('channel123');
  });

  it('should return empty array if channel not found for fetching messages', async () => {
    MockDiscordClient.mock.results[0].value.channels.fetch.mockResolvedValue(null);
    const messages = await discordService.fetchMessages('invalidChannel');
    expect(messages).toEqual([]);
  });

  it('should send public announcement', async () => {
    const mockSendMessage = jest.spyOn(discordService, 'sendMessageToChannel');
    mockSendMessage.mockResolvedValue('mockAnnouncementId');

    await discordService.sendPublicAnnouncement('channel123', 'Test Announcement');
    expect(mockSendMessage).toHaveBeenCalledWith('channel123', '**Announcement**: Test Announcement', 'Bot1', undefined);
  });

  it('should get client ID', () => {
    discordService.getAllBots()[0].botUserId = 'mockBotUserId';
    expect(discordService.getClientId()).toBe('mockBotUserId');
  });

  it('should get default channel', () => {
    expect(discordService.getDefaultChannel()).toBe('mockDefaultChannelId');
  });

  it('should shutdown all bots', async () => {
    process.env.DISCORD_BOT_TOKEN = 'token1,token2';
    (Discord.DiscordService as any).instance = undefined;
    discordService = Discord.DiscordService.getInstance();
    await discordService.initialize(); // Initialize bots first

    const destroySpy1 = jest.spyOn(discordService.getAllBots()[0].client, 'destroy');
    const destroySpy2 = jest.spyOn(discordService.getAllBots()[1].client, 'destroy');

    await discordService.shutdown();

    expect(destroySpy1).toHaveBeenCalledTimes(1);
    expect(destroySpy2).toHaveBeenCalledTimes(1);
    expect((Discord.DiscordService as any).instance).toBeUndefined();
  });

  it('should get bot by name', () => {
    process.env.DISCORD_BOT_TOKEN = 'token1,token2';
    (Discord.DiscordService as any).instance = undefined;
    discordService = Discord.DiscordService.getInstance();
    discordService.getAllBots()[0].botUserName = 'BotOne';
    discordService.getAllBots()[1].botUserName = 'BotTwo';

    expect(discordService.getBotByName('BotOne')).toBeDefined();
    expect(discordService.getBotByName('BotTwo')).toBeDefined();
    expect(discordService.getBotByName('NonExistentBot')).toBeUndefined();
  });
});
