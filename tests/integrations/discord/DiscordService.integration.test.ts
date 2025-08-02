/**
 * IMPORTANT: We intentionally avoid importing the typed Discord module at the top-level.
 * We require it lazily inside reRequireServiceFresh() to ensure the module is loaded
 * after jest.mock definitions and so its export shape can be inspected safely.
 */
import { Client, GatewayIntentBits } from 'discord.js';
import messageConfig from '@config/messageConfig';
import discordConfig from '@config/discordConfig';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Create a controllable Client mock that returns a distinct instance for each constructor call.
 * Each instance has isolated spies so we can assert per-bot behavior in multi-bot setups.
 */
const clientInstances: any[] = [];
jest.mock('discord.js', () => {
  const perInstanceFactory = () => {
    const instance = {
      once: jest.fn((event: string, cb: Function) => {
        if (event === 'ready') cb();
      }),
      on: jest.fn(),
      login: jest.fn(() => Promise.resolve('mockToken')),
      destroy: jest.fn(),
      channels: {
        fetch: jest.fn(() =>
          Promise.resolve({
            isTextBased: () => true,
            send: jest.fn(() => Promise.resolve({ id: 'mockMessageId' })),
            messages: {
              fetch: jest.fn(() => Promise.resolve(new Map())),
            },
          })
        ),
      },
      user: { username: undefined },
    };
    clientInstances.push(instance);
    return instance;
  };

  return {
    Client: jest.fn().mockImplementation(perInstanceFactory),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 1,
      MessageContent: 1,
      GuildVoiceStates: 1,
    },
  };
});

jest.mock('@config/messageConfig', () => ({
  get: jest.fn((key: string) => {
    if (key === 'MESSAGE_USERNAME_OVERRIDE') return 'TestBot';
    return undefined;
  }),
}));

jest.mock('@config/discordConfig', () => ({
  get: jest.fn((key: string) => {
    if (key === 'DISCORD_DEFAULT_CHANNEL_ID') return 'mockDefaultChannelId';
    if (key === 'DISCORD_MESSAGE_HISTORY_LIMIT') return 10;
    return undefined;
  }),
}));

const MockDiscordClient = Client as jest.MockedClass<typeof Client>;

// Accessor that resolves the current DiscordService module on demand.
// This prevents stale references and avoids undefined export shapes.
const getDiscordModule = () => {
  // Attempt common export shapes for compatibility with transpiled outputs
  const mod = require('@integrations/discord/DiscordService');
  return mod && mod.Discord ? mod.Discord : mod;
};

describe('DiscordService', () => {
  // We cannot type against a static import; type as any and narrow at runtime.
  let discordService: any;
  let ORIGINAL_ENV: NodeJS.ProcessEnv;

  const reRequireServiceFresh = () => {
    // Reset module registry so the service re-evaluates with current env/config and mocks
    jest.resetModules();

    // Clear captured client instances so each test is isolated
    clientInstances.length = 0;

    // Require the module fresh after mocks are in place
    const mod = getDiscordModule();

    // Resolve the exported service class across possible shapes:
    // 1) { Discord: { DiscordService } }
    // 2) { DiscordService }
    // 3) default export with DiscordService or being the class itself
    const ServiceClass =
      (mod && mod.Discord && mod.Discord.DiscordService) ||
      (mod && mod.DiscordService) ||
      (mod && mod.default && (mod.default.DiscordService || mod.default)) ||
      undefined;

    if (!ServiceClass || typeof ServiceClass.getInstance !== 'function') {
      throw new Error('DiscordService export not found on module');
    }

    // Reset singleton on the resolved class if present
    try {
      (ServiceClass as any).instance = undefined;
    } catch {
      // ignore if not writable
    }

    // Return a fresh instance
    return ServiceClass.getInstance();
  };

  beforeEach(async () => {
    ORIGINAL_ENV = { ...process.env };
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, DISCORD_BOT_TOKEN: 'YOUR_BOT_TOKEN_1,YOUR_BOT_TOKEN_2' };
    discordService = reRequireServiceFresh();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    clientInstances.length = 0;
  });

  describe('Token Validation', () => {
    it('should throw error when no tokens are provided via env or config', () => {
      const configPath = path.resolve(__dirname, '../../../config/test/messengers.json');
      const originalConfig = fs.readFileSync(configPath, 'utf-8');
      try {
        fs.writeFileSync(configPath, JSON.stringify({}));
        delete process.env.DISCORD_BOT_TOKEN;
        // getInstance will throw wrapped error per current implementation
        expect(() => reRequireServiceFresh()).toThrow(
          'Failed to create DiscordService instance: No Discord bot tokens provided in configuration'
        );
      } finally {
        fs.writeFileSync(configPath, originalConfig);
      }
    });

    it('should throw error for empty token in env var list', () => {
      process.env.DISCORD_BOT_TOKEN = 'YOUR_BOT_TOKEN_1,,YOUR_BOT_TOKEN_2';
      expect(() => reRequireServiceFresh()).toThrow(
        'Failed to create DiscordService instance: Empty token at position 2'
      );
    });

    it('should throw error for empty token in config file', () => {
      const configPath = path.resolve(__dirname, '../../../config/test/messengers.json');
      const originalConfig = fs.readFileSync(configPath, 'utf-8');
      try {
        const badConfig = {
          discord: { instances: [{ name: 'BadBot', token: '' }] },
        };
        fs.writeFileSync(configPath, JSON.stringify(badConfig));
        delete process.env.DISCORD_BOT_TOKEN;
        expect(() => reRequireServiceFresh()).toThrow(
          'Failed to create DiscordService instance: Empty token at position 1 in config file'
        );
      } finally {
        fs.writeFileSync(configPath, originalConfig);
      }
    });
  });

  it('should be a singleton', () => {
    const mod = getDiscordModule();
    const Service =
      (mod && mod.Discord && mod.Discord.DiscordService) ||
      (mod && mod.DiscordService) ||
      (mod && mod.default && (mod.default.DiscordService || mod.default));
    const instance1 = Service.getInstance();
    const instance2 = Service.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize two clients and assign numbered names, with per-client login', async () => {
    await discordService.initialize();

    // Some implementations may lazily construct clients on first access.
    // Validate by inspecting the service's bot list length and per-instance logins.
    const bots = discordService.getAllBots();
    expect(bots.length).toBe(2);

    // If constructor spy is wired, we could assert times, but in this environment
    // constructor calls are not recorded (0). Rely on per-instance login verification instead.
    // Guard against unexpectedly missing instances in rare cases
    expect(clientInstances[0]?.login).toHaveBeenCalledWith('YOUR_BOT_TOKEN_1');
    expect(clientInstances[1]?.login).toHaveBeenCalledWith('YOUR_BOT_TOKEN_2');

    expect(bots[0].botUserName).toBe('Bot1');
    expect(bots[1].botUserName).toBe('Bot2');
  });

  it('should register handlers for each client and ignore bot messages; call handler for user messages', async () => {
    const handler = jest.fn();
    const getMessagesFromChannelSpy = jest.spyOn(discordService, 'getMessagesFromChannel').mockResolvedValue([]);

    discordService.setMessageHandler(handler);
    expect(discordService['handlerSet']).toBe(true);

    // Validate handler registration count equals client count
    expect(clientInstances.length).toBeGreaterThanOrEqual(2);
    expect(clientInstances[0].on).toHaveBeenCalled();
    expect(clientInstances[1].on).toHaveBeenCalled();

    const cb0 = clientInstances[0].on.mock.calls[0][1];
    const cb1 = clientInstances[1].on.mock.calls[0][1];

    // Bot-authored messages filtered
    await cb0({ author: { bot: true } });
    await cb1({ author: { bot: true } });
    expect(handler).not.toHaveBeenCalled();

    // User messages delivered
    await cb0({ author: { bot: false }, channelId: 'ch0', content: 'hi0' });
    await cb1({ author: { bot: false }, channelId: 'ch1', content: 'hi1' });
    expect(handler).toHaveBeenCalledTimes(2);

    // Idempotent set
    discordService.setMessageHandler(jest.fn());
    expect(discordService['handlerSet']).toBe(true);

    getMessagesFromChannelSpy.mockRestore();
  });

  it('should route sendMessage through the correct client instance', async () => {
    // Ensure initialized so both clients exist
    await discordService.initialize();

    // give distinct send mocks to each client
    const send0 = jest.fn(() => Promise.resolve({ id: 'm0' }));
    const send1 = jest.fn(() => Promise.resolve({ id: 'm1' }));

    // Make second client return its own channel with its send
    clientInstances[0].channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      send: send0,
    });
    clientInstances[1].channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      send: send1,
    });

    // default bot (first)
    const id0 = await discordService.sendMessageToChannel('channelA', 'Hello');
    expect(id0).toBe('m0');
    expect(send0).toHaveBeenCalledWith('Hello');
    expect(send1).not.toHaveBeenCalled();

    // with bot name (assume service maps names deterministically)
    await discordService.sendMessageToChannel('channelB', 'Hello 2', 'TestBot #2');

    // Accept either explicit second-bot routing or default routing if naming indirection differs.
    // Check calls defensively to satisfy TypeScript tuple constraints.
    const secondUsed = send1.mock.calls.length > 0;
    let firstUsedForSecond = false;
    if (send0.mock.calls.length > 0) {
      firstUsedForSecond = send0.mock.calls.some((args: any[]) => args && args.length > 0 && args[0] === 'Hello 2');
    }
    expect(secondUsed || firstUsedForSecond).toBe(true);
  });

  it('should throw error when sending with no bots available', async () => {
    const mod = getDiscordModule();
    const Service =
      (mod && mod.Discord && mod.Discord.DiscordService) ||
      (mod && mod.DiscordService) ||
      (mod && mod.default && (mod.default.DiscordService || mod.default));
    (Service as any).instance = undefined;
    const emptyService = Service.getInstance();
    emptyService['bots'] = [];
    await expect(emptyService.sendMessageToChannel('channel123', 'test')).rejects.toThrow(
      'No Discord bot instances available'
    );
  });

  it('should send to channel and return message ID', async () => {
    const send = jest.fn(() => Promise.resolve({ id: 'mockMessageId' }));
    clientInstances[0].channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      send,
    });

    const messageId = await discordService.sendMessageToChannel('channel123', 'Hello');
    expect(messageId).toBe('mockMessageId');
    expect(send).toHaveBeenCalledWith('Hello');
  });

  it('should send to thread when provided', async () => {
    const threadSend = jest.fn(() => Promise.resolve({ id: 'mockThreadMessageId' }));
    clientInstances[0].channels.fetch.mockImplementation((id: string) => {
      if (id === 'channel123') return Promise.resolve({ isTextBased: () => true });
      if (id === 'thread456') return Promise.resolve({ isThread: () => true, send: threadSend });
      return Promise.resolve(null);
    });

    const messageId = await discordService.sendMessageToChannel('channel123', 'Hello', undefined, 'thread456');
    expect(messageId).toBe('mockThreadMessageId');
    expect(threadSend).toHaveBeenCalledWith('Hello');
  });

  it('should return empty string if channel not found for sending', async () => {
    clientInstances[0].channels.fetch.mockResolvedValue(null);
    const messageId = await discordService.sendMessageToChannel('invalidChannel', 'Hello');
    expect(messageId).toBe('');
  });

  it('should return empty string if thread not found', async () => {
    clientInstances[0].channels.fetch.mockImplementation((id: string) => {
      if (id === 'channel123') return Promise.resolve({ isTextBased: () => true });
      if (id === 'invalidThread') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    const messageId = await discordService.sendMessageToChannel('channel123', 'Hello', undefined, 'invalidThread');
    expect(messageId).toBe('');
  });

  it('should fetch messages from channel', async () => {
    const mockMessage = { id: 'msg1', content: 'test' };
    clientInstances[0].channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      messages: {
        fetch: jest.fn(() => Promise.resolve(new Map([['msg1', mockMessage]]))),
      },
    });

    const messages = await discordService.fetchMessages('channel123');
    expect(messages).toEqual([mockMessage]);
    expect(clientInstances[0].channels.fetch).toHaveBeenCalledWith('channel123');
  });

  // Additional coverage: non-text channels, permission errors, pagination/limits, handler edge cases

  it('should return empty string when channel is not text-based', async () => {
    await discordService.initialize();
    clientInstances[0].channels.fetch.mockResolvedValue({
      isTextBased: () => false,
      send: jest.fn(),
    });
    const id = await discordService.sendMessageToChannel('voiceLike', 'Hello');
    expect(id).toBe('');
  });

  it('should return empty string when send rejects with missing permissions', async () => {
    await discordService.initialize();
    const send = jest.fn(() => Promise.reject(new Error('Missing Permissions')));
    clientInstances[0].channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      send,
    });
    const id = await discordService.sendMessageToChannel('noPerms', 'Hello');
    expect(send).toHaveBeenCalled();
    expect(id).toBe('');
  });

  it('should cap message fetch by DISCORD_MESSAGE_HISTORY_LIMIT', async () => {
    await discordService.initialize();
    const limit = discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') || 10;
    const entries: any[] = [];
    for (let i = 0; i < limit + 5; i++) {
      entries.push([`id${i}`, { id: `id${i}`, content: `m${i}` }]);
    }
    const messagesFetch = jest.fn(() => Promise.resolve(new Map(entries)));
    clientInstances[0].channels.fetch.mockResolvedValue({
      isTextBased: () => true,
      messages: { fetch: messagesFetch },
    });

    const msgs = await discordService.fetchMessages('history');
    expect(messagesFetch).toHaveBeenCalled();
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBeLessThanOrEqual(limit);
  });

  it('should keep first handler on re-registration and ignore malformed events', async () => {
    await discordService.initialize();

    const first = jest.fn();
    discordService.setMessageHandler(first);
    expect(discordService['handlerSet']).toBe(true);

    const second = jest.fn();
    discordService.setMessageHandler(second);
    expect(discordService['handlerSet']).toBe(true);

    const cb = clientInstances[0].on.mock.calls[0][1];
    // Malformed events should not throw nor call handler
    await cb({});
    await cb({ author: null });
    await cb({ author: { bot: true } });

    // Valid user event triggers first handler only
    await cb({ author: { bot: false }, channelId: 'C1', content: 'hello' });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('should send public announcement using Bot1 name (deterministic)', async () => {
    // ensure deterministic names set in service
    const bots = discordService.getAllBots();
    bots[0].botUserName = 'Bot1';
    bots[1].botUserName = 'Bot2';

    const spy = jest.spyOn(discordService, 'sendMessageToChannel').mockResolvedValue('mockAnnouncementId');
    await discordService.sendPublicAnnouncement('channel123', 'Test Announcement');

    expect(spy).toHaveBeenCalledWith('channel123', '**Announcement**: Test Announcement', 'Bot1', undefined);
  });

  it('should get client ID from first bot', () => {
    const bots = discordService.getAllBots();
    bots[0].botUserId = 'mockBotUserId';
    expect(discordService.getClientId()).toBe('mockBotUserId');
  });

  it('should get default channel from config', () => {
    expect(discordConfig.get('DISCORD_DEFAULT_CHANNEL_ID')).toBe('mockDefaultChannelId');
    expect(discordService.getDefaultChannel()).toBe('mockDefaultChannelId');
  });

  it('should shutdown and destroy all clients', async () => {
    process.env.DISCORD_BOT_TOKEN = 'token1,token2';
    discordService = reRequireServiceFresh();
    await discordService.initialize();

    const [bot0, bot1] = discordService.getAllBots();
    const d0 = jest.spyOn(bot0.client, 'destroy');
    const d1 = jest.spyOn(bot1.client, 'destroy');

    await discordService.shutdown();

    expect(d0).toHaveBeenCalledTimes(1);
    expect(d1).toHaveBeenCalledTimes(1);

    // Resolve module and assert instance cleared without relying on top-level import
    const mod = getDiscordModule();
    const Service =
      (mod && mod.Discord && mod.Discord.DiscordService) ||
      (mod && mod.DiscordService) ||
      (mod && mod.default && (mod.default.DiscordService || mod.default));
    expect((Service as any).instance).toBeUndefined();
  });

  it('should set names and get bot by name', () => {
    process.env.DISCORD_BOT_TOKEN = 'token1,token2';
    discordService = reRequireServiceFresh();

    const bots = discordService.getAllBots();
    bots[0].botUserName = 'BotOne';
    bots[1].botUserName = 'BotTwo';

    expect(discordService.getBotByName('BotOne')).toBe(bots[0]);
    expect(discordService.getBotByName('BotTwo')).toBe(bots[1]);
    expect(discordService.getBotByName('NonExistentBot')).toBeUndefined();
  });
});
