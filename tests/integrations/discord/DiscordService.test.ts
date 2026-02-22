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

// Safe Mocks - No external variable references in factory
jest.mock('@config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@config/ProviderConfigManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@config/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@config/discordConfig', () => ({
  get: jest.fn((key) => {
    switch (key) {
      case 'DISCORD_MESSAGE_HISTORY_LIMIT':
        return 10;
      case 'DISCORD_DEFAULT_CHANNEL_ID':
        return 'test-channel-123';
      default:
        return undefined;
    }
  }),
}));

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

// Must be prefixed with 'mock' for jest.mock() access
let mockClients: MockClient[] = [];
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
      mockClients.push(client);
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
  let mockGetDiscordBotConfigs: jest.Mock;
  let mockGetAllProviders: jest.Mock;
  let mockIsBotDisabled: jest.Mock;

  // Helper to reset singleton and re-import
  const resetServiceSingleton = () => {
    // Reset the singleton instance via module internals
    const dsModule = require('@hivemind/adapter-discord');
    if (dsModule.Discord && dsModule.Discord.DiscordService) {
      dsModule.Discord.DiscordService.instance = undefined;
    }
    // Also clear the bots array if instance exists
    if (
      dsModule.Discord &&
      dsModule.Discord.DiscordService &&
      dsModule.Discord.DiscordService.instance
    ) {
      dsModule.Discord.DiscordService.instance.bots = [];
    }
  };

  // Helper to setup mocks after module reset
  const setupMocks = () => {
    const { BotConfigurationManager: MockBCM } = require('@config/BotConfigurationManager');
    const MockPCM = require('@config/ProviderConfigManager').default;
    const { UserConfigStore: MockUCS } = require('@config/UserConfigStore');
    const MockMessageConfig = require('@config/messageConfig').default;

    mockGetDiscordBotConfigs = jest.fn().mockReturnValue([
      {
        name: 'TestBot1',
        messageProvider: 'discord',
        discord: { token: 'test_token_1' },
        llmProvider: 'flowise',
      },
    ]);

    MockBCM.getInstance.mockReturnValue({
      getDiscordBotConfigs: mockGetDiscordBotConfigs,
      getSlackBotConfigs: jest.fn().mockReturnValue([]),
      getMattermostBotConfigs: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    });

    mockGetAllProviders = jest.fn().mockReturnValue([]);
    MockPCM.getInstance.mockReturnValue({
      getAllProviders: mockGetAllProviders,
    });

    mockIsBotDisabled = jest.fn().mockReturnValue(false);
    MockUCS.getInstance.mockReturnValue({
      isBotDisabled: mockIsBotDisabled,
      get: jest.fn(),
      set: jest.fn(),
    });

    MockMessageConfig.get.mockReturnValue(undefined);
  };

  beforeEach(() => {
    // Reset all state
    jest.resetModules();
    mockDebugCaptures.length = 0; // Clear array without reassigning
    mockClients = [];
    mockClientCounter = 0;

    // Re-import and setup mocks
    setupMocks();

    // Import DiscordService fresh
    DiscordService = require('@hivemind/adapter-discord').DiscordService;
    service = DiscordService.getInstance();
  });

  afterEach(async () => {
    if (service) {
      try {
        await service.shutdown();
      } catch {
        // Ignore shutdown errors in cleanup
      }
    }
    resetServiceSingleton();
    mockClients = [];
    mockDebugCaptures.length = 0; // Clear array without reassigning
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
      expect(combinedLogs).toContain('app:discordService');
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
      // Reset singleton for this test
      resetServiceSingleton();

      // Setup mock with invalid token
      const { BotConfigurationManager: MockBCM } = require('@config/BotConfigurationManager');
      MockBCM.getInstance.mockReturnValue({
        getDiscordBotConfigs: jest.fn().mockReturnValue([
          {
            name: 'TestBot1',
            messageProvider: 'discord',
            discord: discordConfig,
            llmProvider: 'flowise',
          },
        ]),
        getSlackBotConfigs: jest.fn().mockReturnValue([]),
        getMattermostBotConfigs: jest.fn().mockReturnValue([]),
        getWarnings: jest.fn().mockReturnValue([]),
        isLegacyMode: jest.fn().mockReturnValue(false),
      });

      // Re-import service
      const FreshDiscordService = require('@hivemind/adapter-discord').DiscordService;
      const freshService = FreshDiscordService.getInstance();

      await freshService.initialize();
      expect(freshService.getAllBots()).toHaveLength(0);
    });
  });

  describe('message handling', () => {
    it('sets and handles message handler correctly', async () => {
      // Configure mock to ignore bots for this test
      const messageConfig = require('@config/messageConfig').default;
      messageConfig.get.mockImplementation((key: string) => {
        if (key === 'MESSAGE_IGNORE_BOTS') return true;
        if (key === 'MESSAGE_USERNAME_OVERRIDE') return 'Madgwick AI';
        return undefined;
      });

      await service.initialize();
      const mockHandlerError = jest.fn().mockRejectedValue(new Error('Handler error'));

      service.setMessageHandler(mockHandlerError);

      // Verify that the message handler is stored
      expect((service as any).currentHandler).toBe(mockHandlerError);

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
      (service as any).bots = [
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

      // Reset singleton
      resetServiceSingleton();

      // Setup mock with no bot configs (legacy mode)
      const { BotConfigurationManager: MockBCM } = require('@config/BotConfigurationManager');
      MockBCM.getInstance.mockReturnValue({
        getDiscordBotConfigs: jest.fn().mockReturnValue([]),
        getSlackBotConfigs: jest.fn().mockReturnValue([]),
        getMattermostBotConfigs: jest.fn().mockReturnValue([]),
        getWarnings: jest.fn().mockReturnValue([]),
        isLegacyMode: jest.fn().mockReturnValue(false),
      });

      // Re-import service
      const FreshDiscordService = require('@hivemind/adapter-discord').DiscordService;
      const freshService = FreshDiscordService.getInstance();

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
