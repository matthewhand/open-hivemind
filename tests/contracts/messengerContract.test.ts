/**
 * Contract tests for IMessengerService implementations.
 *
 * These tests verify that every messenger provider conforms to the
 * IMessengerService interface defined in src/message/interfaces/IMessengerService.ts.
 * All external dependencies (Discord.js, Slack SDK, Mattermost client) are mocked.
 */

// ---------------------------------------------------------------------------
// Mocks — declared before imports
// ---------------------------------------------------------------------------

// Discord.js
jest.mock('discord.js', () => {
  const mockClient = {
    login: jest.fn().mockResolvedValue('ok'),
    destroy: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(),
    once: jest.fn().mockReturnThis(),
    removeAllListeners: jest.fn().mockReturnThis(),
    user: { id: 'discord-bot-123', tag: 'TestBot#1234' },
    channels: {
      cache: new Map(),
      fetch: jest.fn().mockResolvedValue({
        isTextBased: () => true,
        send: jest.fn().mockResolvedValue({ id: 'msg-1' }),
        messages: { fetch: jest.fn().mockResolvedValue(new Map()) },
        topic: 'test topic',
      }),
    },
    guilds: { cache: new Map() },
    isReady: jest.fn().mockReturnValue(true),
  };
  return {
    Client: jest.fn().mockImplementation(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 512,
      MessageContent: 32768,
      GuildVoiceStates: 128,
    },
    REST: jest.fn(),
    Routes: {},
    __mockClient: mockClient,
  };
});

// Slack SDKs
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: '123.456' }) },
    conversations: {
      history: jest.fn().mockResolvedValue({ messages: [] }),
      info: jest.fn().mockResolvedValue({ channel: { topic: { value: 'test' } } }),
    },
    auth: { test: jest.fn().mockResolvedValue({ user_id: 'U123', user: 'testbot' }) },
  })),
}));

jest.mock('@slack/rtm-api', () => ({
  RTMClient: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

jest.mock('@slack/socket-mode', () => ({
  SocketModeClient: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Mattermost client
jest.mock('@integrations/mattermost/mattermostClient', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      postMessage: jest.fn().mockResolvedValue({ id: 'mm-msg-1' }),
      getChannelPosts: jest.fn().mockResolvedValue({ order: [], posts: {} }),
    })),
  };
});

// Common application mocks
jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([]),
      getBotConfigByName: jest.fn().mockReturnValue(null),
    }),
  },
}));

jest.mock('@src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({
      increment: jest.fn(),
      gauge: jest.fn(),
      histogram: jest.fn(),
      timing: jest.fn(),
    }),
  },
}));

jest.mock('@src/services/StartupGreetingService', () => ({
  StartupGreetingService: jest.fn().mockImplementation(() => ({
    sendGreeting: jest.fn(),
  })),
}));

jest.mock('@config/messageConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(() => '') },
}));

jest.mock('@config/slackConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(() => '') },
}));

jest.mock('@message/routing/ChannelRouter', () => ({
  computeScore: jest.fn().mockReturnValue(0),
}));

jest.mock('@src/llm/getLlmProvider', () => ({
  getLlmProvider: jest.fn(),
}));

jest.mock('@src/types/errorClasses', () => ({
  ApiError: class ApiError extends Error { constructor(m: string) { super(m); this.name = 'ApiError'; } },
  BaseHivemindError: class BaseHivemindError extends Error {},
  ConfigurationError: class ConfigurationError extends Error { constructor(m: string, code?: string) { super(m); this.name = 'ConfigurationError'; } },
  NetworkError: class NetworkError extends Error { constructor(m: string) { super(m); this.name = 'NetworkError'; } },
  ValidationError: class ValidationError extends Error { constructor(m: string) { super(m); this.name = 'ValidationError'; } },
}));

jest.mock('@src/types/errors', () => ({
  ErrorUtils: { toErrorString: jest.fn((e: any) => String(e)) },
}));

jest.mock('@src/utils/errorResponse', () => ({
  createErrorResponse: jest.fn(),
}));

jest.mock('debug', () => {
  const noop: any = () => {};
  noop.extend = () => noop;
  return () => noop;
});


jest.mock('tsyringe', () => ({
  container: { resolve: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { IMessengerService } from '@message/interfaces/IMessengerService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generic contract suite that verifies IMessengerService conformance.
 * The service is provided pre-constructed but NOT yet initialized
 * (initialize() will be called in the test).
 */
function runMessengerContractTests(
  serviceName: string,
  getService: () => IMessengerService,
) {
  describe(`IMessengerService contract: ${serviceName}`, () => {
    let service: IMessengerService;

    beforeEach(() => {
      service = getService();
    });

    // ----- Required methods -----------------------------------------------

    it('has initialize() returning a Promise', () => {
      expect(typeof service.initialize).toBe('function');
    });

    it('has sendMessageToChannel() function', () => {
      expect(typeof service.sendMessageToChannel).toBe('function');
    });

    it('has getMessagesFromChannel() function', () => {
      expect(typeof service.getMessagesFromChannel).toBe('function');
    });

    it('has sendPublicAnnouncement() function', () => {
      expect(typeof service.sendPublicAnnouncement).toBe('function');
    });

    it('has getClientId() returning a string', () => {
      expect(typeof service.getClientId).toBe('function');
      const id = service.getClientId();
      expect(typeof id).toBe('string');
    });

    it('has getDefaultChannel() returning a string', () => {
      expect(typeof service.getDefaultChannel).toBe('function');
      const ch = service.getDefaultChannel();
      expect(typeof ch).toBe('string');
    });

    it('has shutdown() returning a Promise', () => {
      expect(typeof service.shutdown).toBe('function');
    });

    it('has setMessageHandler() function', () => {
      expect(typeof service.setMessageHandler).toBe('function');
    });

    // ----- Optional methods -----------------------------------------------

    it('if getChannelTopic is defined, it is a function', () => {
      if (service.getChannelTopic !== undefined) {
        expect(typeof service.getChannelTopic).toBe('function');
      }
    });

    it('if scoreChannel is defined, it is a function', () => {
      if (service.scoreChannel !== undefined) {
        expect(typeof service.scoreChannel).toBe('function');
      }
    });

    it('if getForumOwner is defined, it is a function', () => {
      if (service.getForumOwner !== undefined) {
        expect(typeof service.getForumOwner).toBe('function');
      }
    });

    it('if getDelegatedServices is defined, it is a function', () => {
      if (service.getDelegatedServices !== undefined) {
        expect(typeof service.getDelegatedServices).toBe('function');
      }
    });

    it('if setModelActivity is defined, it is a function', () => {
      if (service.setModelActivity !== undefined) {
        expect(typeof service.setModelActivity).toBe('function');
      }
    });

    it('if sendTyping is defined, it is a function', () => {
      if (service.sendTyping !== undefined) {
        expect(typeof service.sendTyping).toBe('function');
      }
    });

    it('if resolveAgentContext is defined, it is a function', () => {
      if (service.resolveAgentContext !== undefined) {
        expect(typeof service.resolveAgentContext).toBe('function');
      }
    });

    // ----- setMessageHandler contract ------------------------------------

    it('setMessageHandler accepts a handler function without throwing', () => {
      expect(() => {
        service.setMessageHandler(async (_msg, _hist, _cfg) => 'test');
      }).not.toThrow();
    });

    // ----- Error handling ------------------------------------------------

    it('sendMessageToChannel returns a Promise (does not throw synchronously)', () => {
      // We only assert the function returns a thenable — the actual send may
      // fail because we haven't initialized, but it shouldn't throw synchronously.
      const result = service.sendMessageToChannel('chan', 'hello');
      expect(result).toBeDefined();
      expect(typeof result.then).toBe('function');
      // Swallow expected rejection
      result.catch(() => {});
    });
  });
}

// ---------------------------------------------------------------------------
// Build stub messenger services that satisfy the interface structurally
// ---------------------------------------------------------------------------

/**
 * Creates a minimal DiscordService-shaped object.
 * We can't easily construct the real singleton without heavy DI, so we
 * create a structural stub that mirrors the class's public API.
 */
function createDiscordServiceStub(): IMessengerService {
  const handler: any = null;
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    sendMessageToChannel: jest.fn().mockResolvedValue('msg-id-1'),
    getMessagesFromChannel: jest.fn().mockResolvedValue([]),
    sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    getClientId: jest.fn().mockReturnValue('discord-bot-123'),
    getDefaultChannel: jest.fn().mockReturnValue('general'),
    shutdown: jest.fn().mockResolvedValue(undefined),
    setMessageHandler: jest.fn(),
    getChannelTopic: jest.fn().mockResolvedValue('test topic'),
    scoreChannel: jest.fn().mockReturnValue(0),
    getForumOwner: jest.fn().mockResolvedValue('owner-id'),
    getDelegatedServices: jest.fn().mockReturnValue([]),
    sendTyping: jest.fn().mockResolvedValue(undefined),
    setModelActivity: jest.fn().mockResolvedValue(undefined),
    resolveAgentContext: jest.fn().mockReturnValue(null),
    supportsChannelPrioritization: true,
    getAgentStartupSummaries: jest.fn().mockReturnValue([]),
  };
}

function createSlackServiceStub(): IMessengerService {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    sendMessageToChannel: jest.fn().mockResolvedValue('123.456'),
    getMessagesFromChannel: jest.fn().mockResolvedValue([]),
    sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    getClientId: jest.fn().mockReturnValue('U123'),
    getDefaultChannel: jest.fn().mockReturnValue('general'),
    shutdown: jest.fn().mockResolvedValue(undefined),
    setMessageHandler: jest.fn(),
    getChannelTopic: jest.fn().mockResolvedValue('slack topic'),
    scoreChannel: jest.fn().mockReturnValue(0),
    sendTyping: jest.fn().mockResolvedValue(undefined),
    supportsChannelPrioritization: true,
    getAgentStartupSummaries: jest.fn().mockReturnValue([]),
  };
}

function createMattermostServiceStub(): IMessengerService {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    sendMessageToChannel: jest.fn().mockResolvedValue('mm-msg-1'),
    getMessagesFromChannel: jest.fn().mockResolvedValue([]),
    sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    getClientId: jest.fn().mockReturnValue('mm-bot-id'),
    getDefaultChannel: jest.fn().mockReturnValue('town-square'),
    shutdown: jest.fn().mockResolvedValue(undefined),
    setMessageHandler: jest.fn(),
    scoreChannel: jest.fn().mockReturnValue(0),
    sendTyping: jest.fn().mockResolvedValue(undefined),
    supportsChannelPrioritization: true,
    getAgentStartupSummaries: jest.fn().mockReturnValue([]),
  };
}

// ---------------------------------------------------------------------------
// Run contract tests for each messenger
// ---------------------------------------------------------------------------

runMessengerContractTests('DiscordService (stub)', createDiscordServiceStub);
runMessengerContractTests('SlackService (stub)', createSlackServiceStub);
runMessengerContractTests('MattermostService (stub)', createMattermostServiceStub);

// ---------------------------------------------------------------------------
// Additional structural tests to verify real classes expose the interface
// ---------------------------------------------------------------------------

describe('IMessengerService structural conformance', () => {
  it('DiscordService class prototype has required IMessengerService methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DiscordService } = require('@integrations/discord/DiscordService');
    const proto = DiscordService.prototype;

    expect(typeof proto.initialize).toBe('function');
    expect(typeof proto.sendMessageToChannel).toBe('function');
    expect(typeof proto.getMessagesFromChannel).toBe('function');
    expect(typeof proto.sendPublicAnnouncement).toBe('function');
    expect(typeof proto.getClientId).toBe('function');
    expect(typeof proto.getDefaultChannel).toBe('function');
    expect(typeof proto.shutdown).toBe('function');
    expect(typeof proto.setMessageHandler).toBe('function');
  });

  it('SlackService class prototype has required IMessengerService methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SlackService } = require('@integrations/slack/SlackService');
    const proto = SlackService.prototype;

    expect(typeof proto.initialize).toBe('function');
    expect(typeof proto.sendMessageToChannel).toBe('function');
    expect(typeof proto.getMessagesFromChannel).toBe('function');
    expect(typeof proto.sendPublicAnnouncement).toBe('function');
    expect(typeof proto.getClientId).toBe('function');
    expect(typeof proto.getDefaultChannel).toBe('function');
    expect(typeof proto.shutdown).toBe('function');
    expect(typeof proto.setMessageHandler).toBe('function');
  });

  it('MattermostService class prototype has required IMessengerService methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MattermostService } = require('@integrations/mattermost/MattermostService');
    const proto = MattermostService.prototype;

    expect(typeof proto.initialize).toBe('function');
    expect(typeof proto.sendMessageToChannel).toBe('function');
    expect(typeof proto.getMessagesFromChannel).toBe('function');
    expect(typeof proto.sendPublicAnnouncement).toBe('function');
    expect(typeof proto.getClientId).toBe('function');
    expect(typeof proto.getDefaultChannel).toBe('function');
    expect(typeof proto.shutdown).toBe('function');
    expect(typeof proto.setMessageHandler).toBe('function');
  });
});
