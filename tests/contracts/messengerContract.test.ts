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
// Structural tests to verify real classes expose the interface
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
