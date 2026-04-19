import 'reflect-metadata';
import path from 'path';

// Class-based mocks for tsyringe compatibility
class MockStartupGreetingService {
  static getInstance = jest.fn(() => new MockStartupGreetingService());
  greetAll = jest.fn();
}

class MockWebSocketService {
  static getInstance = jest.fn(() => new MockWebSocketService());
  broadcastBotStatus = jest.fn();
  broadcastConfigChange = jest.fn();
}

jest.mock('fs', () => ({
  readFileSync: jest.fn(() =>
    JSON.stringify({
      providers: [{ type: 'discord' }, { type: 'slack' }],
    })
  ),
  existsSync: jest.fn(() => true),
  readdirSync: jest.fn(() => []),
}));

jest.mock('@hivemind/message-discord', () => ({
  DiscordService: {
    getInstance: jest.fn(() => ({
      provider: 'discord',
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
    })),
  },
}));

jest.mock('@hivemind/message-slack', () => ({
  SlackService: {
    getInstance: jest.fn(() => ({
      provider: 'slack',
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/services/StartupGreetingService', () => ({
  __esModule: true,
  StartupGreetingService: MockStartupGreetingService,
  default: MockStartupGreetingService,
}));

jest.mock('../../../src/server/services/websocket', () => ({
  __esModule: true,
  WebSocketService: MockWebSocketService,
  default: MockWebSocketService,
}));

// We must also mock the individual service files because they might be imported directly
jest.mock('../../../src/server/services/WebSocketService', () => ({
  __esModule: true,
  WebSocketService: MockWebSocketService,
  default: MockWebSocketService,
}));

jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn((token) => {
      if (token && (token.name === 'WebSocketService' || token.toString().includes('WebSocketService'))) {
        return { broadcastBotStatus: jest.fn(), broadcastConfigChange: jest.fn() };
      }
      if (token && (token.name === 'StartupGreetingService' || token.toString().includes('StartupGreetingService'))) {
        return { greetAll: jest.fn() };
      }
      return {};
    }),
    isRegistered: jest.fn().mockReturnValue(true),
  },
  singleton: () => (target: any) => target,
  injectable: () => (target: any) => target,
  inject: () => (target: any) => target,
}));

import { getMessengerProvider } from '../../../src/message/management/getMessengerProvider';

describe('getMessengerProvider filtering', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Use the Proxy-friendly set approach
    process.env.MESSAGE_PROVIDER = originalEnv.MESSAGE_PROVIDER;
  });

  afterAll(() => {
    process.env.MESSAGE_PROVIDER = originalEnv.MESSAGE_PROVIDER;
  });

  it('a) MESSAGE_PROVIDER="discord": only Discord is initialized', async () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    const providers = await getMessengerProvider();
    expect(providers.length).toBe(1);
    expect(providers[0].provider).toBe('discord');
  });

  it('b) MESSAGE_PROVIDER="slack": only Slack is initialized', async () => {
    process.env.MESSAGE_PROVIDER = 'slack';
    const providers = await getMessengerProvider();
    expect(providers.length).toBe(1);
    expect(providers[0].provider).toBe('slack');
  });

  it('c) MESSAGE_PROVIDER="discord,slack": both are initialized', async () => {
    process.env.MESSAGE_PROVIDER = 'discord,slack';
    const providers = await getMessengerProvider();
    expect(providers.length).toBe(2);
    const names = providers.map((p) => p.provider);
    expect(names).toContain('discord');
    expect(names).toContain('slack');
  });

  it('d) MESSAGE_PROVIDER set to unavailable provider: returns empty or default', async () => {
    process.env.MESSAGE_PROVIDER = 'nonexistent';
    const providers = await getMessengerProvider();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('e) MESSAGE_PROVIDER unset: defaults to available providers', async () => {
    delete process.env.MESSAGE_PROVIDER;
    const providers = await getMessengerProvider();
    expect(providers.length).toBeGreaterThan(0);
  });
});
