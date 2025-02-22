import { DiscordService } from '@integrations/discord/DiscordService';
import { Client, GatewayIntentBits } from 'discord.js';
import { MessageDelayScheduler } from '@message/helpers/handler/MessageDelayScheduler';
import messageConfig from '@message/interfaces/messageConfig';
import { Path } from 'convict'; // Import Path type

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    channels: {
      fetch: jest.fn().mockImplementation((id) => ({
        isTextBased: () => true,
        isThread: () => id.startsWith('thread-'),
        send: jest.fn().mockResolvedValue({ id: 'msg123', startThread: jest.fn().mockResolvedValue({ id: `thread-${id}` }) }),
        messages: { fetch: jest.fn().mockResolvedValue(new Map()) },
      })),
    },
    user: { id: 'bot1', tag: 'Bot1#1234' },
    on: jest.fn(),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildVoiceStates: 8,
  },
}));

jest.mock('@message/helpers/handler/MessageDelayScheduler', () => ({
  MessageDelayScheduler: {
    getInstance: jest.fn().mockReturnValue({
      scheduleMessage: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@message/interfaces/messageConfig', () => {
  const original = jest.requireActual('@message/interfaces/messageConfig').default;
  return {
    __esModule: true,
    default: {
      ...original,
      get: jest.fn((key: string) => original.get(key)), // Default to original values
    },
  };
});

type ConfigSchema = {
  MESSAGE_PROVIDER: string;
  MESSAGE_IGNORE_BOTS: boolean;
  MESSAGE_ADD_USER_HINT: boolean;
  MESSAGE_RATE_LIMIT_PER_CHANNEL: number;
  MESSAGE_MIN_DELAY: number;
  MESSAGE_MAX_DELAY: number;
  MESSAGE_ACTIVITY_TIME_WINDOW: number;
  MESSAGE_WAKEWORDS: string;
  MESSAGE_ONLY_WHEN_SPOKEN_TO: boolean;
  MESSAGE_INTERACTIVE_FOLLOWUPS: boolean;
  MESSAGE_UNSOLICITED_ADDRESSED: boolean;
  MESSAGE_UNSOLICITED_UNADDRESSED: boolean;
  MESSAGE_RESPOND_IN_THREAD: boolean;
  MESSAGE_THREAD_RELATION_WINDOW: number;
};

describe('DiscordService', () => {
  let service: DiscordService;
  let schedulerMock: any;

  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = 'token1';
    process.env.DISCORD_USERNAME_OVERRIDE = 'Bot1';
    process.env.MESSAGE_WAKEWORDS = '!help,!ping';
    (DiscordService as any).instance = undefined;
    jest.clearAllMocks();
    service = DiscordService.getInstance();
    schedulerMock = MessageDelayScheduler.getInstance();
    // Mock messageConfig.get with typed defaults
    const defaults: Partial<ConfigSchema> = {
      MESSAGE_RESPOND_IN_THREAD: false,
      MESSAGE_IGNORE_BOTS: true,
      MESSAGE_WAKEWORDS: '!help,!ping',
      MESSAGE_ONLY_WHEN_SPOKEN_TO: true,
      MESSAGE_INTERACTIVE_FOLLOWUPS: false,
      MESSAGE_UNSOLICITED_ADDRESSED: false,
      MESSAGE_UNSOLICITED_UNADDRESSED: false,
      MESSAGE_THREAD_RELATION_WINDOW: 300000,
    };
    (messageConfig.get as jest.Mock).mockImplementation((key: Path<ConfigSchema>) => process.env[key] || defaults[key] || messageConfig.get(key));
  });

  afterEach(() => {
    (DiscordService as any).instance = undefined;
  });

  it('initializes bot', async () => {
    await service.initialize();
    const bots = service['bots'];
    expect(bots.length).toBe(1);
    expect(bots[0].botUserName).toBe('Bot1');
    expect(bots[0].client.login).toHaveBeenCalledWith('token1');
  });

  it('schedules message on command', async () => {
    await service.initialize();
    const mockMessage = { author: { bot: false, id: 'user1' }, content: '!help', channelId: '123', id: 'msg1' };
    const bot = service['bots'][0];
    const handler = (bot.client.on as jest.Mock).mock.calls.find((call: [string, Function]) => call[0] === 'messageCreate')![1];
    await handler(mockMessage);
    expect(schedulerMock.scheduleMessage).toHaveBeenCalledWith('123', 'msg1', 'Echo: !help', 'user1', expect.any(Function), true);
  });

  it('sends message to channel without thread', async () => {
    (messageConfig.get as jest.Mock).mockImplementation((key: Path<ConfigSchema>) => key === 'MESSAGE_RESPOND_IN_THREAD' ? false : messageConfig.get(key));
    await service.initialize();
    const messageId = await service.sendMessageToChannel('123', 'Hello', 'Bot1');
    expect(messageId).toBe('msg123');
    expect(service['bots'][0].client.channels.fetch).toHaveBeenCalledWith('123');
  });

  it('creates thread and sends message when configured', async () => {
    (messageConfig.get as jest.Mock).mockImplementation((key: Path<ConfigSchema>) => key === 'MESSAGE_RESPOND_IN_THREAD' ? true : messageConfig.get(key));
    await service.initialize();
    const threadId = await service.sendMessageToChannel('123', 'Test', 'Bot1');
    expect(threadId).toMatch(/^thread-/);
  });

  it('sends message to existing thread', async () => {
    await service.initialize();
    const messageId = await service.sendMessageToChannel('123', 'In thread', 'Bot1', 'thread-123');
    expect(messageId).toBe('msg123');
    expect(service['bots'][0].client.channels.fetch).toHaveBeenCalledWith('thread-123');
  });

  it('shuts down bot client', async () => {
    await service.initialize();
    await service.shutdown();
    expect(service['bots'][0].client.destroy).toHaveBeenCalled();
    expect((DiscordService as any).instance).toBeUndefined();
  });

  it('fetches messages from channel', async () => {
    await service.initialize();
    const messages = await service.getMessagesFromChannel('123');
    expect(messages).toEqual([]);
    expect(service['bots'][0].client.channels.fetch).toHaveBeenCalledWith('123');
  });

  it('sends public announcement', async () => {
    await service.initialize();
    await service.sendPublicAnnouncement('123', 'Announce');
    expect(service['bots'][0].client.channels.fetch).toHaveBeenCalledWith('123');
  });
});
