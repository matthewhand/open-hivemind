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
      provider: 'slack',
    })),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() =>
    JSON.stringify({
      providers: [{ type: 'discord' }, { type: 'slack' }],
    })
  ),
  existsSync: jest.fn(() => true),
  readdirSync: jest.fn(() => []),
}));

// Use the global mocks in the hoisted mock factory
jest.mock('../../../src/services/StartupGreetingService', () => {
  class MockStartupGreetingService {
    static getInstance() {
      return new MockStartupGreetingService();
    }
    greetAll(...args: any[]) {
      return (global as any).mockGreetingFunctions.greetAll(...args);
    }
  }
  return {
    __esModule: true,
    StartupGreetingService: MockStartupGreetingService,
    default: MockStartupGreetingService,
  };
});

jest.mock('../../../src/server/services/websocket', () => {
  class MockWebSocketService {
    static getInstance() {
      return new MockWebSocketService();
    }
    broadcastBotStatus(...args: any[]) {
      return (global as any).mockWSFunctions.broadcastBotStatus(...args);
    }
    broadcastConfigChange(...args: any[]) {
      return (global as any).mockWSFunctions.broadcastConfigChange(...args);
    }
  }
  return {
    __esModule: true,
    WebSocketService: MockWebSocketService,
    default: MockWebSocketService,
  };
});

jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn((token) => {
      if (token && (token.name === 'WebSocketService' || token.toString().includes('WebSocketService'))) {
        return { broadcastBotStatus: jest.fn(), broadcastConfigChange: jest.fn() };
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

describe('getMessengerProvider Unit Test', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return DiscordMessageProvider when MESSAGE_PROVIDER is "discord"', async () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    const providers = await getMessengerProvider();
    expect(providers[0].provider).toBe('discord');
  });

  it('should return SlackMessageProvider when MESSAGE_PROVIDER is "slack"', async () => {
    process.env.MESSAGE_PROVIDER = 'slack';
    const providers = await getMessengerProvider();
    expect(providers[0].provider).toBe('slack');
  });
});
