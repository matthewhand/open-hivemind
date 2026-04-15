import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerServices, areServicesRegistered, TOKENS } from '../../../src/di/registration';

// Mock all singleton services to prevent real initialization
jest.mock('../../../src/config/ConfigurationManager', () => ({
  ConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({ reload: jest.fn() }),
    resetInstance: jest.fn(),
    getAllBots: jest.fn().mockReturnValue([]),
  },
  __esModule: true,
}));

jest.mock('../../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/config/SecureConfigManager', () => ({
  SecureConfigManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/config/MCPProviderManager', () => ({
  MCPProviderManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/database/SchemaManager', () => ({
  SchemaManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/server/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({}),
  },
  __esModule: true,
}));

jest.mock('../../../src/config/ProviderConfigManager', () => {
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn().mockReturnValue({ syncBotProviders: jest.fn() }),
    },
  };
});

jest.mock('../../../src/common/logger', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  (global as any).mockLogger = logger;
  return {
    __esModule: true,
    default: {
      withContext: jest.fn(() => logger),
    },
    Logger: {
      withContext: jest.fn(() => logger),
    },
  };
});

describe('DI Service Registration Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    container.reset();
  });

  it('should log service registrations and completion', () => {
    registerServices();

    // Verify completion log (info level)
    expect((global as any).mockLogger.info).toHaveBeenCalledWith('DI services registered');
  });

  it('should check if services are registered', () => {
    // initially not registered
    expect(areServicesRegistered()).toBe(false);

    registerServices();
    expect(areServicesRegistered()).toBe(true);
  });
});
