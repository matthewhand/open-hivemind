import { BotConfigurationManager } from '@config/BotConfigurationManager';
import ProviderConfigManager from '@config/ProviderConfigManager';
import { UserConfigStore } from '@config/UserConfigStore';

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

// Mock discord.js
jest.mock('discord.js', () => {
  let clientCount = 0;
  const createMockClient = () => {
    clientCount++;
    const mockClient = {
      on: jest.fn(),
      once: jest.fn().mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
      }),
      login: jest.fn().mockResolvedValue(undefined),
      user: { id: `bot${clientCount}`, tag: `Bot${clientCount}#1234` },
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    return mockClient;
  };

  return {
    Client: jest.fn(createMockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildVoiceStates: 8,
    },
  };
});

describe('DiscordService', () => {
  let DiscordService: any;
  let service: any;
  let mockGetDiscordBotConfigs: jest.Mock;
  let mockGetAllProviders: jest.Mock;
  let mockIsBotDisabled: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    // Re-require mocks to get fresh instances after resetModules
    const { BotConfigurationManager: MockBCM } = require('@config/BotConfigurationManager');
    const MockPCM = require('@config/ProviderConfigManager').default;
    const { UserConfigStore: MockUCS } = require('@config/UserConfigStore');
    const MockMessageConfig = require('@config/messageConfig').default;

    // Setup BotConfigurationManager mock
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

    // Setup ProviderConfigManager mock
    mockGetAllProviders = jest.fn().mockReturnValue([]);
    MockPCM.getInstance.mockReturnValue({
      getAllProviders: mockGetAllProviders,
    });

    // Setup UserConfigStore mock
    mockIsBotDisabled = jest.fn().mockReturnValue(false);
    MockUCS.getInstance.mockReturnValue({
      isBotDisabled: mockIsBotDisabled,
      get: jest.fn(),
      set: jest.fn(),
    });

    // Setup messageConfig mock
    MockMessageConfig.get.mockReturnValue(undefined);

    DiscordService = require('@hivemind/adapter-discord').DiscordService;
    service = DiscordService.getInstance();
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
    // Manually reset singletons after each test
    const dsModule = require('@hivemind/adapter-discord');
    if (dsModule.Discord && dsModule.Discord.DiscordService) {
      dsModule.Discord.DiscordService.instance = undefined;
    }
    const bcmModule = require('@config/BotConfigurationManager');
    if (bcmModule.BotConfigurationManager) {
      bcmModule.BotConfigurationManager.instance = undefined;
    }
    // Clear mock implementation
    mockGetDiscordBotConfigs.mockClear();
  });

  it('initializes correctly', async () => {
    await service.initialize();
    expect(service.getAllBots()).toHaveLength(1);
    const bot = service.getAllBots()[0];
    expect(bot.botUserName).toBe('TestBot1');
    expect(bot.client.login).toHaveBeenCalledWith('test_token_1');
  });

  // TODO: Fix mock issues - debug mock not capturing correctly
  it('logs structured ready info and sets botUserId on client ready', async () => {
    const debugCalls: string[] = [];
    jest.doMock('debug', () => {
      return (ns: string) => (msg: string) => {
        debugCalls.push(`[${ns}] ${msg}`);
      };
    });

    jest.resetModules();

    // Re-configure mocks after resetModules
    const { BotConfigurationManager: MockBCM } = require('@config/BotConfigurationManager');
    const MockPCM = require('@config/ProviderConfigManager').default;
    const { UserConfigStore: MockUCS } = require('@config/UserConfigStore');
    const MockMessageConfig = require('@config/messageConfig').default;

    MockBCM.getInstance.mockReturnValue({
      getDiscordBotConfigs: mockGetDiscordBotConfigs, // Reuse the mock var from outer scope?
      // Wait, mockGetDiscordBotConfigs is from beforeEach closure? 
      // No, it's defined in describe scope.
      // It holds the value set in beforeEach.
      getSlackBotConfigs: jest.fn().mockReturnValue([]),
      getMattermostBotConfigs: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    });
    MockPCM.getInstance.mockReturnValue({
      getAllProviders: jest.fn().mockReturnValue([]),
    });
    MockUCS.getInstance.mockReturnValue({
      isBotDisabled: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
    });
    MockMessageConfig.get.mockReturnValue(undefined);

    const { DiscordService: LocalDiscordService } = require('@hivemind/adapter-discord');
    const localService = LocalDiscordService.getInstance();

    await localService.initialize();
    const bot = localService.getAllBots()[0];

    // botUserId is derived from client.user.id set by our discord.js mock
    expect(bot.botUserId).toBe(bot.client.user.id);

    // Ensure structured log includes expected identity fields
    const combinedLogs = debugCalls.join('\n');
    expect(combinedLogs).toContain('app:discordService');
    expect(combinedLogs).toContain('Discord bot ready:');
    expect(combinedLogs).toContain('name=TestBot1');
    expect(combinedLogs).toContain(`id=${bot.client.user.id}`);
    expect(combinedLogs).toContain(`tag=${bot.client.user.tag}`);
  });

  it('shuts down correctly', async () => {
    await service.initialize();
    const bot = service.getAllBots()[0];
    await service.shutdown();
    expect(bot.client.destroy).toHaveBeenCalled();
  });

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

  // TODO: Fix mock issues - singleton reset not working properly between tests
  it.each([
    ['empty', { token: '' }],
    ['missing', {}]
  ])('handles %s token validation during initialization', async (type, discordConfig) => {
    mockGetDiscordBotConfigs.mockReturnValue([
      {
        name: 'TestBot1',
        messageProvider: 'discord',
        discord: discordConfig,
        llmProvider: 'flowise',
      },
    ]);

    jest.resetModules();

    // Re-configure mocks after resetModules
    const { BotConfigurationManager: MockBCM3 } = require('@config/BotConfigurationManager');
    const MockPCM3 = require('@config/ProviderConfigManager').default;
    const { UserConfigStore: MockUCS3 } = require('@config/UserConfigStore');
    const MockMessageConfig3 = require('@config/messageConfig').default;

    MockBCM3.getInstance.mockReturnValue({
      getDiscordBotConfigs: mockGetDiscordBotConfigs,
      getSlackBotConfigs: jest.fn().mockReturnValue([]),
      getMattermostBotConfigs: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    });
    MockPCM3.getInstance.mockReturnValue({
      getAllProviders: jest.fn().mockReturnValue([]),
    });
    MockUCS3.getInstance.mockReturnValue({
      isBotDisabled: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
    });
    MockMessageConfig3.get.mockReturnValue(undefined);

    DiscordService = require('@hivemind/adapter-discord').DiscordService;
    service = DiscordService.getInstance();

    await service.initialize();
    expect(service.getAllBots()).toHaveLength(0);
  });

  // TODO: Fix mock issues - client.on not registering messageCreate calls properly
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

  it('supports channel prioritization', () => {
    expect(service.supportsChannelPrioritization).toBe(true);
  });

  it('resolveAgentContext can use per-bot id to include discord username as a name candidate', () => {
    // Arrange: simulate a swarm bot whose config includes the resolved Discord user id.
    (service as any).bots = [
      {
        botUserId: '555555555555555555',
        botUserName: 'SomeInternalLabel',
        client: { user: { username: 'seneca', globalName: 'Seneca' }, destroy: jest.fn().mockResolvedValue(undefined) },
        config: { BOT_ID: '555555555555555555', discord: { clientId: '555555555555555555' }, name: 'NotSeneca' }
      }
    ];

    const ctx = service.resolveAgentContext({
      botConfig: { BOT_ID: '555555555555555555', name: 'NotSeneca', discord: { clientId: '555555555555555555' } },
      agentDisplayName: 'Madgwick AI'
    });

    expect(ctx).toBeTruthy();
    expect(ctx.botId).toBe('555555555555555555');
    expect(ctx.senderKey).toBe('555555555555555555');
    expect(ctx.nameCandidates).toEqual(expect.arrayContaining(['seneca', 'Seneca']));
  });

  it('handles configuration and bot management', async () => {
    // Test legacy configuration with comma-separated tokens
    process.env.DISCORD_BOT_TOKEN = 'token1,token2';
    mockGetDiscordBotConfigs.mockReturnValue([]);
    jest.resetModules();

    // Re-configure mocks after resetModules
    const { BotConfigurationManager: MockBCM } = require('@config/BotConfigurationManager');
    const MockPCM = require('@config/ProviderConfigManager').default;
    const { UserConfigStore: MockUCS } = require('@config/UserConfigStore');
    const MockMessageConfig = require('@config/messageConfig').default;

    MockBCM.getInstance.mockReturnValue({
      getDiscordBotConfigs: mockGetDiscordBotConfigs,
      getSlackBotConfigs: jest.fn().mockReturnValue([]),
      getMattermostBotConfigs: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    });
    MockPCM.getInstance.mockReturnValue({
      getAllProviders: jest.fn().mockReturnValue([]),
    });
    MockUCS.getInstance.mockReturnValue({
      isBotDisabled: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
    });
    MockMessageConfig.get.mockReturnValue(undefined);

    DiscordService = require('@hivemind/adapter-discord').DiscordService;
    service = DiscordService.getInstance();
    let bots = service.getAllBots();
    expect(bots).toHaveLength(2);
    expect(bots[0].config.token).toBe('token1');
    expect(bots[1].config.token).toBe('token2');
    delete process.env.DISCORD_BOT_TOKEN;

    // Reset mocks and test adding bot successfully
    jest.clearAllMocks();
    mockGetDiscordBotConfigs.mockReturnValue([{
      name: 'TestBot1',
      messageProvider: 'discord',
      discord: { token: 'test_token_1' },
      llmProvider: 'flowise',
    }]);
    jest.resetModules();

    // Re-configure mocks after resetModules
    const { BotConfigurationManager: MockBCM2 } = require('@config/BotConfigurationManager');
    const MockPCM2 = require('@config/ProviderConfigManager').default;
    const { UserConfigStore: MockUCS2 } = require('@config/UserConfigStore');
    const MockMessageConfig2 = require('@config/messageConfig').default;

    MockBCM2.getInstance.mockReturnValue({
      getDiscordBotConfigs: mockGetDiscordBotConfigs,
      getSlackBotConfigs: jest.fn().mockReturnValue([]),
      getMattermostBotConfigs: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    });
    MockPCM2.getInstance.mockReturnValue({
      getAllProviders: jest.fn().mockReturnValue([]),
    });
    MockUCS2.getInstance.mockReturnValue({
      isBotDisabled: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
    });
    MockMessageConfig2.get.mockReturnValue(undefined);

    DiscordService = require('@hivemind/adapter-discord').DiscordService;
    service = DiscordService.getInstance();
    await service.initialize();

    const initialBotCount = service.getAllBots().length;

    await service.addBot({
      name: 'NewBot',
      discord: { token: 'new_token' },
      llmProvider: 'openai'
    });

    expect(service.getAllBots()).toHaveLength(initialBotCount + 1);
    const newBot = service.getAllBots()[service.getAllBots().length - 1];
    expect(newBot.botUserName).toBe('NewBot');
    expect(newBot.config.token).toBe('new_token');
  });

  it.each([
    ['without token', {}],
    ['with empty token', { token: '' }]
  ])('throws error when adding bot %s', async (desc, discord) => {
    await service.initialize();

    await expect(service.addBot({
      name: 'NewBot',
      discord
    })).rejects.toThrow('Discord addBot requires a token');
  });
});
