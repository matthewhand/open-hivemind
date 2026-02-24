import { EventEmitter } from 'events';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Store for captured debug logs across tests - must be prefixed with 'mock' for jest.mock() access
const mockDebugCaptures: { namespace: string; message: string }[] = [];

// Mock debug module - must be before any imports that use it
jest.mock('debug', () => {
  return jest.fn((namespace: string) => {
    return (message: string) => {
      mockDebugCaptures.push({ namespace, message });
    };
  });
});

// Mock dependencies (no longer need to mock singletons, we inject manual mocks)
jest.mock('@config/BotConfigurationManager', () => ({}));
jest.mock('@config/ProviderConfigManager', () => ({}));
jest.mock('@config/UserConfigStore', () => ({}));
jest.mock('@config/messageConfig', () => ({}));
jest.mock('@config/discordConfig', () => ({}));

// Track created clients for event handler verification
interface MockClient {
  on: jest.Mock;
  once: jest.Mock;
  login: jest.Mock;
  destroy: jest.Mock;
  user: { id: string; tag: string; username: string; globalName: string };
  ws: { status: number; ping: number };
  uptime: number;
  emit: (event: string, ...args: any[]) => boolean;
  listeners: (event: string) => Function[];
}

let mockClientCounter = 0;

// Mock discord.js with proper EventEmitter behavior
jest.mock('discord.js', () => {
  const EventEmitter = require('events').EventEmitter;

  return {
    Client: jest.fn().mockImplementation(() => {
      mockClientCounter++;
      const internalEmitter = new EventEmitter();

      // Create client with mock functions that delegate to internal emitter
      const client: MockClient = {
        on: jest.fn((event: string, handler: (...args: any[]) => void) => {
          internalEmitter.on(event, handler);
          return client;
        }),
        once: jest.fn((event: string, handler: (...args: any[]) => void) => {
          // Auto-trigger 'ready' event for initialization
          if (event === 'ready') {
            setTimeout(() => handler(), 0);
          } else {
            internalEmitter.once(event, handler);
          }
          return client;
        }),
        login: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockResolvedValue(undefined),
        user: {
          id: `bot${mockClientCounter}`,
          tag: `Bot${mockClientCounter}#1234`,
          username: `Bot${mockClientCounter}`,
          globalName: `Bot${mockClientCounter}`,
        },
        ws: {
          status: 0,
          ping: 42,
        },
        uptime: 123456,
        emit: (event: string, ...args: any[]) => internalEmitter.emit(event, ...args),
        listeners: (event: string) => internalEmitter.listeners(event) as Function[],
      };
      return client;
    }),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildVoiceStates: 8,
    },
  };
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('DiscordService', () => {
  let DiscordService: any;
  let service: any;
  let mockDeps: any;

  beforeEach(() => {
    // Reset all state
    jest.resetModules();
    mockDebugCaptures.length = 0;
    mockClientCounter = 0;

    // Prepare mock dependencies
    mockDeps = {
      botConfigManager: {
        getDiscordBotConfigs: jest.fn().mockReturnValue([]), // Unused by DiscordBotManager directly now
        getSlackBotConfigs: jest.fn().mockReturnValue([]),
        getMattermostBotConfigs: jest.fn().mockReturnValue([]),
        getWarnings: jest.fn().mockReturnValue([]),
        isLegacyMode: jest.fn().mockReturnValue(false),
      },
      // DiscordBotManager uses flattened accessors from IServiceDependencies
      getAllBotConfigs: jest.fn().mockReturnValue([
          {
            name: 'TestBot1',
            messageProvider: 'discord',
            discord: { token: 'test_token_1' },
            llmProvider: 'flowise',
          },
      ]),
      isBotDisabled: jest.fn().mockReturnValue(false),

      providerConfigManager: {
        getAllProviders: jest.fn().mockReturnValue([]),
      },
      userConfigStore: {
        isBotDisabled: jest.fn().mockReturnValue(false),
        get: jest.fn(),
        set: jest.fn(),
      },
      messageConfig: {
        get: jest.fn().mockImplementation((key) => {
            if (key === 'MESSAGE_IGNORE_BOTS') return false;
            return undefined;
        }),
      },
      discordConfig: {
        get: jest.fn((key) => {
          if (key === 'DISCORD_MESSAGE_HISTORY_LIMIT') return 10;
          if (key === 'DISCORD_DEFAULT_CHANNEL_ID') return 'test-channel-123';
          return undefined;
        }),
      },
      errorTypes: {
        NetworkError: class extends Error {},
        ConfigError: class extends Error {},
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
      startupGreetingService: {
        emit: jest.fn(),
      },
      channelRouter: {
        computeScore: jest.fn().mockReturnValue(0),
      },
      webSocketService: {
        recordAlert: jest.fn(),
      },
    };

    // Import DiscordService fresh
    const { DiscordService: DS } = require('@hivemind/adapter-discord');
    DiscordService = DS;

    // Instantiate with dependency injection
    service = new DiscordService(mockDeps);
  });

  afterEach(async () => {
    if (service) {
      try {
        await service.shutdown();
      } catch {
        // Ignore shutdown errors in cleanup
      }
    }
    mockDebugCaptures.length = 0;
  });

  describe('initialization', () => {
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
  });

  describe('bot and client management', () => {
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

    it('supports channel prioritization', () => {
      expect(service.supportsChannelPrioritization).toBe(true);
    });
  });

  describe('debug logging', () => {
    it('logs structured ready info and sets botUserId on client ready', async () => {
      await service.initialize();
      const bot = service.getAllBots()[0];

      // botUserId is derived from client.user.id set by our discord.js mock
      expect(bot.botUserId).toBe(bot.client.user.id);

      // Wait for any async debug logs to flush
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Ensure structured log includes expected identity fields
      const combinedLogs = mockDebugCaptures
        .map((c: { namespace: string; message: string }) => `[${c.namespace}] ${c.message}`)
        .join('\n');
      // Updated to match refactored logging location (moved to DiscordBotManager)
      expect(combinedLogs).toContain('app:discordBotManager');
      expect(combinedLogs).toContain('Discord bot ready:');
      expect(combinedLogs).toContain('name=TestBot1');
      expect(combinedLogs).toContain(`id=${bot.client.user.id}`);
      expect(combinedLogs).toContain(`tag=${bot.client.user.tag}`);
    });
  });

  describe('token validation', () => {
    it.each([
      ['empty', { token: '' }],
      ['missing', {}],
    ])('handles %s token validation during initialization', async (type, discordConfig) => {
      // Setup mock with invalid token override
      mockDeps.getAllBotConfigs = jest.fn().mockReturnValue([
          {
            name: 'TestBot1',
            messageProvider: 'discord',
            discord: discordConfig,
            llmProvider: 'flowise',
          },
      ]);

      // Re-instantiate service
      const freshService = new DiscordService(mockDeps);

      await freshService.initialize();
      expect(freshService.getAllBots()).toHaveLength(0);
    });
  });

  describe('message handling', () => {
    it('sets and handles message handler correctly', async () => {
      // Configure mock to ignore bots for this test
      mockDeps.messageConfig.get = jest.fn((key: string) => {
        if (key === 'MESSAGE_IGNORE_BOTS') return true;
        if (key === 'MESSAGE_USERNAME_OVERRIDE') return 'Madgwick AI';
        return undefined;
      });
      service = new DiscordService(mockDeps); // Refresh service with new config

      await service.initialize();
      const mockHandlerError = jest.fn().mockRejectedValue(new Error('Handler error'));

      service.setMessageHandler(mockHandlerError);

      // Verify that the message handler is stored (delegated to eventHandler)
      expect((service as any).eventHandler.currentHandler).toBe(mockHandlerError);

      // Verify that event listeners are set up for all bots
      const bot = service.getAllBots()[0];

      // The client.on mock should have been called with 'messageCreate'
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
      expect(mockHandlerError).toHaveBeenCalledTimes(1);
    });
  });

  describe('agent context resolution', () => {
    it('resolveAgentContext can use per-bot id to include discord username as a name candidate', () => {
      // Arrange: simulate a swarm bot whose config includes the resolved Discord user id.
      // Updated to inject into botManager as DiscordService delegates storage
      (service as any).botManager.bots = [
        {
          botUserId: '555555555555555555',
          botUserName: 'SomeInternalLabel',
          client: {
            user: { username: 'seneca', globalName: 'Seneca' },
            destroy: jest.fn().mockResolvedValue(undefined),
          },
          config: {
            BOT_ID: '555555555555555555',
            discord: { clientId: '555555555555555555' },
            name: 'NotSeneca',
          },
        },
      ];

      const ctx = service.resolveAgentContext({
        botConfig: {
          BOT_ID: '555555555555555555',
          name: 'NotSeneca',
          discord: { clientId: '555555555555555555' },
        },
        agentDisplayName: 'Madgwick AI',
      });

      expect(ctx).toBeTruthy();
      expect(ctx.botId).toBe('555555555555555555');
      expect(ctx.senderKey).toBe('555555555555555555');
      expect(ctx.nameCandidates).toEqual(expect.arrayContaining(['seneca', 'Seneca']));
    });
  });

  describe('configuration and bot management', () => {
    it('handles legacy configuration with comma-separated tokens', async () => {
      // Set legacy env var
      process.env.DISCORD_BOT_TOKEN = 'token1,token2';

      // Setup mock with no bot configs (legacy mode)
      mockDeps.getAllBotConfigs = jest.fn().mockReturnValue([]);

      const freshService = new DiscordService(mockDeps);

      await freshService.initialize();
      let bots = freshService.getAllBots();

      expect(bots).toHaveLength(2);
      expect(bots[0].config.token).toBe('token1');
      expect(bots[1].config.token).toBe('token2');

      // Cleanup
      delete process.env.DISCORD_BOT_TOKEN;
      await freshService.shutdown();
    });

    it('adds bot successfully', async () => {
      await service.initialize();

      const initialBotCount = service.getAllBots().length;

      await service.addBot({
        name: 'NewBot',
        discord: { token: 'new_token' },
        llmProvider: 'openai',
      });

      expect(service.getAllBots()).toHaveLength(initialBotCount + 1);
      const newBot = service.getAllBots()[service.getAllBots().length - 1];
      expect(newBot.botUserName).toBe('NewBot');
      expect(newBot.config.token).toBe('new_token');
    });

    it.each([
      ['without token', {}],
      ['with empty token', { token: '' }],
    ])('throws error when adding bot %s', async (desc, discord) => {
      await service.initialize();

      await expect(
        service.addBot({
          name: 'NewBot',
          discord,
        })
      ).rejects.toThrow('Discord addBot requires a token');
    });
  });
});
