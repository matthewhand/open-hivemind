import 'reflect-metadata';
import path from 'path';
import { container } from 'tsyringe';
import { ConnectionManager } from '@src/server/services/websocket/ConnectionManager';
import { BroadcastService } from '@src/server/services/websocket/BroadcastService';
import { EventHandlers } from '@src/server/services/websocket/EventHandlers';
import { WebSocketService } from '@src/server/services/WebSocketService';
import { StartupGreetingService } from '@src/services/StartupGreetingService';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import {
  getMessengerProvider,
  resetMessengerProviderCache,
} from '@src/message/management/getMessengerProvider';
import { registerServices } from '@src/di/registration';

// Mock StartupGreetingService and MetricsCollector
jest.mock('@src/services/StartupGreetingService', () => {
  const mockSGS = { initialize: jest.fn() };
  return {
    StartupGreetingService: {
      getInstance: jest.fn(() => mockSGS),
    },
    __mockInstance: mockSGS,
  };
});

jest.mock('@src/monitoring/MetricsCollector', () => {
  const mockMC = { record: jest.fn() };
  return {
    MetricsCollector: {
      getInstance: jest.fn(() => mockMC),
    },
    __mockInstance: mockMC,
  };
});

const { __mockInstance: mockStartupGreetingService } = require('@src/services/StartupGreetingService');
const { __mockInstance: mockMetricsCollector } = require('@src/monitoring/MetricsCollector');

// Register mocks in container
container.registerInstance(StartupGreetingService as any, mockStartupGreetingService);
container.registerInstance(MetricsCollector as any, mockMetricsCollector);

// Mock WebSocketService
const mockWebSocketService = {
  initialize: jest.fn(),
  shutdown: jest.fn(),
} as any;
WebSocketService.setInstance(mockWebSocketService);

jest.mock('@hivemind/message-discord', () => ({
  DiscordService: {
    getInstance: jest.fn(() => ({
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
      provider: 'discord',
    })),
  },
}));

jest.mock('@hivemind/message-slack', () => ({
  SlackService: {
    getInstance: jest.fn(() => ({
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
      provider: 'slack',
    })),
  },
}));

jest.mock('@hivemind/message-mattermost', () => ({
  MattermostService: {
    getInstance: jest.fn(() => ({
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
      provider: 'mattermost',
    })),
  },
}));

jest.mock('@hivemind/message-webhook', () => ({
  WebhookService: {
    getInstance: jest.fn(() => ({
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
      provider: 'webhook',
    })),
  },
}));

describe('getMessengerProvider integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    registerServices();
    process.env = { ...originalEnv };
    resetMessengerProviderCache();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('initializes all configured providers', async () => {
    process.env.MESSAGE_PROVIDER = 'discord,slack';
    
    // Mock fs.readFileSync to return a config with no providers (forces env-only)
    jest.mock('fs', () => ({
      readFileSync: jest.fn(() => JSON.stringify({ providers: [] })),
      existsSync: jest.fn(() => true),
    }));

    const providers = await getMessengerProvider();
    expect(providers.length).toBe(2);
    
    const types = providers.map(p => p.provider);
    expect(types).toContain('discord');
    expect(types).toContain('slack');
  });

  it('handles provider specific settings from environment', async () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    process.env.DISCORD_BOT_TOKEN = 'test-token';
    
    const providers = await getMessengerProvider();
    expect(providers.length).toBe(1);
    expect(providers[0].provider).toBe('discord');
  });
});
