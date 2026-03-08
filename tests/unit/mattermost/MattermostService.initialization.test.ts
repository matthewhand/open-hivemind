import 'reflect-metadata';
import { MattermostService } from '@src/integrations/mattermost/MattermostService';
import BotConfigurationManager from '@src/config/BotConfigurationManager';

// Mock BotConfigurationManager
const mockConfigManager = {
  getAllBots: jest.fn(),
};
jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => mockConfigManager),
  },
  getInstance: jest.fn(() => mockConfigManager),
}));

// Mock MetricsCollector
jest.mock('@src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn(() => ({
      incrementMessages: jest.fn(),
      recordResponseTime: jest.fn(),
      incrementErrors: jest.fn(),
      getMetrics: jest.fn(),
    })),
  },
}));

// Mock StartupGreetingService to match the require('../../services/StartupGreetingService').default pattern
jest.mock('@src/services/StartupGreetingService', () => ({
  __esModule: true,
  default: {
    emit: jest.fn(),
  },
}));

// Mock MattermostClient
jest.mock('@hivemind/adapter-mattermost', () => ({
  MattermostClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('MattermostService Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance between tests
    (MattermostService as any).instance = undefined;
  });

  it('should initialize with supportsChannelPrioritization set to true', () => {
    mockConfigManager.getAllBots.mockReturnValue([]);
    const service = MattermostService.getInstance();
    expect(service.supportsChannelPrioritization).toBe(true);
  });

  it('should not initialize any clients if no Mattermost bot configurations are found', () => {
    mockConfigManager.getAllBots.mockReturnValue([]);

    const service = MattermostService.getInstance();

    expect((service as any).clients.size).toBe(0);
    expect(mockConfigManager.getAllBots).toHaveBeenCalled();
  });

  it('should initialize clients for valid Mattermost bot configurations', () => {
    mockConfigManager.getAllBots.mockReturnValue([
      {
        name: 'bot1',
        messageProvider: 'mattermost',
        mattermost: {
          serverUrl: 'http://localhost:8065',
          token: 'token1',
        },
      },
      {
        name: 'bot2',
        messageProvider: 'mattermost',
        mattermost: {
          serverUrl: 'http://localhost:8065',
          token: 'token2',
          channel: 'custom-channel',
        },
      },
    ]);

    const service = MattermostService.getInstance();

    expect((service as any).clients.size).toBe(2);
    expect((service as any).clients.has('bot1')).toBe(true);
    expect((service as any).clients.has('bot2')).toBe(true);
  });

  it('should skip configurations that are not for Mattermost', () => {
    mockConfigManager.getAllBots.mockReturnValue([
      {
        name: 'discord-bot',
        messageProvider: 'discord',
      },
    ]);

    const service = MattermostService.getInstance();

    expect((service as any).clients.size).toBe(0);
  });

  it('should skip Mattermost configurations missing a token', () => {
    mockConfigManager.getAllBots.mockReturnValue([
      {
        name: 'bot-no-token',
        messageProvider: 'mattermost',
        mattermost: {
          serverUrl: 'http://localhost:8065',
        },
      },
    ]);

    const service = MattermostService.getInstance();

    expect((service as any).clients.size).toBe(0);
  });

  it('should skip configurations if mattermost object is missing', () => {
    mockConfigManager.getAllBots.mockReturnValue([
      {
        name: 'bot-no-mattermost-obj',
        messageProvider: 'mattermost',
      },
    ]);

    const service = MattermostService.getInstance();

    expect((service as any).clients.size).toBe(0);
  });
});
