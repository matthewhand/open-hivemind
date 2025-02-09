// Mock DiscordMessage so that it returns an object with getTimestamp() and getMessageId()
jest.mock('../../../src/integrations/discord/DiscordMessage', () => {
  return jest.fn().mockImplementation((msg) => {
    return {
      getTimestamp: () => new Date(),
      getMessageId: () => msg.id,
      getContent: () => msg.content
    };
  });
});

// First, mock 'discord.js' before any imports, using require() for EventEmitter.
jest.mock('discord.js', () => {
  const actualDiscord = jest.requireActual('discord.js');
  const { EventEmitter } = require('events');
  class MockClient extends EventEmitter {
    options: any;
    user: { tag: string; username: string; id: string } | null;
    channels: { fetch: jest.Mock<Promise<any>, [string]> };
    constructor(options: any) {
      super();
      this.options = options;
      this.user = null;
      this.channels = {
        fetch: jest.fn().mockResolvedValue(null),
      };
    }
    login = jest.fn().mockImplementation((token: string) => {
      this.user = { tag: `mockUser-${token}`, username: `bot_${token.slice(-3)}`, id: token };
      setImmediate(() => {
        this.emit('ready');
      });
      return Promise.resolve();
    });
    destroy = jest.fn().mockResolvedValue(undefined);
  }
  return { ...actualDiscord, Client: MockClient };
});

jest.mock('../../../src/integrations/discord/interfaces/discordConfig', () => ({
  get: (key: string) => {
    if (key === 'DISCORD_BOT_TOKEN') {
      return process.env.DISCORD_BOT_TOKEN ? process.env.DISCORD_BOT_TOKEN.split(',') : [];
    }
    if (key === 'DISCORD_CHANNEL_ID') return 'someChannelId';
    if (key === 'DISCORD_LOGGING_ENABLED') return false;
    if (key === 'DISCORD_DEFAULT_CHANNEL_ID') return 'defaultChannel';
    return null;
  }
}));

jest.mock('@src/message/interfaces/messageConfig', () => ({
  get: (key: string) => {
    if (key === 'MESSAGE_HISTORY_LIMIT') return 10;
    if (key === 'MESSAGE_RATE_LIMIT_PER_CHANNEL') return 5;
    if (key === 'MESSAGE_IGNORE_BOTS') return true;
    return null;
  }
}));

jest.mock('../../../src/integrations/discord/guild/debugPermissions', () => ({
  debugPermissions: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/integrations/discord/interaction/sendPublicAnnouncement', () => ({
  sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
}));

import { Client, TextChannel, DMChannel } from 'discord.js';
import { DiscordService } from '../../../src/integrations/discord/DiscordService';

interface DiscordBotInfo {
  botToken: string;
  client: {
    user?: {
      username: string;
      id: string;
      tag: string;
    };
    channels: {
      fetch: jest.Mock<Promise<TextChannel | DMChannel>, [string]>;
    };
    destroy: jest.Mock<Promise<void>, []>;
    on: (event: string, listener: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => boolean;
  };
  botUserId?: string;
}

describe('DiscordService Multi-Bot Functionality', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DISCORD_BOT_TOKEN = 'token1,token2';
  });

  afterEach(() => {
    delete process.env.DISCORD_BOT_TOKEN;
  });

  test('initializes multiple bots', async () => {
    const service = DiscordService.getInstance();
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure initialization

    const bots = (service as any).discordBots;
    expect(bots).toBeDefined();
    expect(bots.length).toBeGreaterThan(0);
    bots.forEach((bot: DiscordBotInfo, index: number) => {
      if (index === 0) {
        expect(bot.botToken).toBe('token1');
      } else if (index === 1) {
        expect(bot.botToken).toBe('token2');
      }
      expect(bot.client.user).toBeDefined();
    });
  });

  test('sendMessageToChannel uses correct bot based on senderName', async () => {
    const service = DiscordService.getInstance();
    await new Promise(resolve => setTimeout(resolve, 50));

    const bots = (service as any).discordBots;
    expect(bots).toBeDefined();
    expect(bots.length).toBeGreaterThan(0);

    // Create a fake channel that is an instance of TextChannel.
    const createFakeTextChannel = () => {
      const fakeChannel = { send: jest.fn().mockResolvedValue('sent'), id: 'fakeChannelId' };
      Object.setPrototypeOf(fakeChannel, TextChannel.prototype);
      return fakeChannel;
    };

    bots.forEach((bot: DiscordBotInfo) => {
      bot.client.channels.fetch = jest.fn().mockResolvedValue(createFakeTextChannel());
    });

    const targetBot = bots.length > 1 ? bots[1] : bots[0];
    const targetBotUsername = targetBot.client.user.username;
    expect(targetBotUsername).toBeDefined();

    await service.sendMessageToChannel('channel123', 'Hello World', targetBotUsername);
    expect(targetBot.client.channels.fetch).toHaveBeenCalledWith('channel123');

    await service.sendMessageToChannel('channel456', 'Default Bot Message');
    expect(bots[0].client.channels.fetch).toHaveBeenCalledWith('channel456');
  });

  test('messageCreate event filters bot messages and empty messages, and routes valid messages', async () => {
    const service = DiscordService.getInstance();
    await new Promise(resolve => setTimeout(resolve, 50));

    const bots = (service as any).discordBots;
    const messageHandlerMock = jest.fn();
    service.setMessageHandler(messageHandlerMock);

    // Use the channel ID that matches the configured filtered channel ("someChannelId")
    const validMessage = {
      id: 'msg1',
      author: { bot: false, username: 'user1' },
      content: 'This is a valid message',
      channel: { id: 'someChannelId', send: jest.fn() },
      partial: false,
      fetch: jest.fn().mockResolvedValue({}),
    };

    bots[0].client.emit('messageCreate', validMessage);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(messageHandlerMock).toHaveBeenCalled();

    const botMessage = {
      id: 'msg2',
      author: { bot: true, username: 'someBot' },
      content: 'Bot message',
      channel: { id: 'someChannelId', send: jest.fn() },
      partial: false,
      fetch: jest.fn().mockResolvedValue({}),
    };
    bots[0].client.emit('messageCreate', botMessage);
    await new Promise(resolve => setTimeout(resolve, 10));
    // Since MESSAGE_IGNORE_BOTS is true, this message should be ignored.
    expect(messageHandlerMock).toHaveBeenCalledTimes(1);

    const emptyMessage = {
      id: 'msg3',
      author: { bot: false, username: 'user' },
      content: '   ',
      channel: { id: 'someChannelId', send: jest.fn() },
      partial: false,
      fetch: jest.fn().mockResolvedValue({}),
    };
    bots[0].client.emit('messageCreate', emptyMessage);
    await new Promise(resolve => setTimeout(resolve, 10));
    // Empty message should also be ignored.
    expect(messageHandlerMock).toHaveBeenCalledTimes(1);
  });

  test('shutdown destroys all bot clients', async () => {
    const service = DiscordService.getInstance();
    await new Promise(resolve => setTimeout(resolve, 50));

    const bots = (service as any).discordBots;
    bots.forEach((bot: DiscordBotInfo) => {
      bot.client.destroy = jest.fn().mockResolvedValue(null);
    });

    await service.shutdown();
    bots.forEach((bot: DiscordBotInfo) => {
      expect(bot.client.destroy).toHaveBeenCalled();
    });
  });
});
