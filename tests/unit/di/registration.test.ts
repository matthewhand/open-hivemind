import 'reflect-metadata';
import { container } from 'tsyringe';
import { areServicesRegistered, registerServices, TOKENS } from '../../../src/di/registration';

// Use a shared mock object defined in a way that avoids hoisting issues
(global as any).mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock all singleton services to prevent real initialization
jest.mock('../../../src/config/ConfigurationManager', () => ({
  ConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({ reload: jest.fn() }),
    resetInstance: jest.fn(),
  },
}));

jest.mock('../../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../../src/config/SecureConfigManager', () => ({
  SecureConfigManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../../src/config/ProviderConfigManager', () => ({
  __esModule: true,
  ProviderConfigManager: {
    getInstance: jest.fn().mockReturnValue({ syncBotProviders: jest.fn() }),
  },
  default: {
    getInstance: jest.fn().mockReturnValue({ syncBotProviders: jest.fn() }),
  },
}));

jest.mock('../../../src/common/logger', () => {
  const mockLoggerInstance = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      withContext: jest.fn(() => mockLoggerInstance),
      ...mockLoggerInstance,
    },
    Logger: {
      withContext: jest.fn(() => mockLoggerInstance),
      ...mockLoggerInstance,
    },
  };
});

// Update test to use the actual mock
const getMockLogger = () => {
  const loggerModule = require('../../../src/common/logger');
  return loggerModule.default.withContext();
};

describe('DI Service Registration Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    container.reset();
  });

  it('should log service registrations and completion', () => {
    registerServices();

    // Verify completion log (info level)
    expect(getMockLogger().info).toHaveBeenCalledWith('DI services registered');
  });

  it('should check if services are registered', () => {
    // initially not registered
    expect(areServicesRegistered()).toBe(false);

    registerServices();
    expect(areServicesRegistered()).toBe(true);
  });
});
