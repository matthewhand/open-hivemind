import 'reflect-metadata';
import path from 'path';

// Define mocks on global object to make them accessible to hoisted jest.mock()
(global as any).mockWSFunctions = {
  broadcastBotStatus: jest.fn(),
  broadcastConfigChange: jest.fn(),
};

(global as any).mockGreetingFunctions = {
  greetAll: jest.fn(),
};

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

// Use the global mocks in the hoisted mock factory
jest.mock('../../../src/services/StartupGreetingService', () => {
  return {
    __esModule: true,
    StartupGreetingService: {
      getInstance: jest.fn(() => ({
        greetAll: (...args: any[]) => (global as any).mockGreetingFunctions.greetAll(...args),
      })),
    },
    default: {
      getInstance: jest.fn(() => ({
        greetAll: (...args: any[]) => (global as any).mockGreetingFunctions.greetAll(...args),
      })),
    },
  };
});

jest.mock('../../../src/server/services/websocket', () => {
  return {
    __esModule: true,
    WebSocketService: {
      getInstance: jest.fn(() => ({
        broadcastBotStatus: (...args: any[]) => (global as any).mockWSFunctions.broadcastBotStatus(...args),
        broadcastConfigChange: (...args: any[]) => (global as any).mockWSFunctions.broadcastConfigChange(...args),
      })),
    },
    default: {
      getInstance: jest.fn(() => ({
        broadcastBotStatus: (...args: any[]) => (global as any).mockWSFunctions.broadcastBotStatus(...args),
        broadcastConfigChange: (...args: any[]) => (global as any).mockWSFunctions.broadcastConfigChange(...args),
      })),
    },
  };
});

import { getMessengerProvider } from '../../../src/message/management/getMessengerProvider';

describe('getMessengerProvider filtering', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
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
    // Implementation behavior for invalid provider varies, but should not crash
    expect(Array.isArray(providers)).toBe(true);
  });

  it('e) MESSAGE_PROVIDER unset: defaults to available providers', async () => {
    delete process.env.MESSAGE_PROVIDER;
    const providers = await getMessengerProvider();
    expect(providers.length).toBeGreaterThan(0);
  });
});
