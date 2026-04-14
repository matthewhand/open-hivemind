import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerServices, areServicesRegistered } from '../../../src/di/registration';

// Use var to ensure hoisting and avoid initialization order issues
var mockLoggerInstance = {
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
  ProviderConfigManager: {
    getInstance: jest.fn().mockReturnValue({ syncBotProviders: jest.fn() }),
  },
  default: {
    getInstance: jest.fn().mockReturnValue({ syncBotProviders: jest.fn() }),
  }
}));

jest.mock('../../../src/common/logger', () => {
  return {
    __esModule: true,
    default: {
      withContext: jest.fn(() => mockLoggerInstance),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
    Logger: {
      withContext: jest.fn(() => mockLoggerInstance),
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
    // Verify completion log (info level) - checking if any info was logged
    expect(mockLoggerInstance.info).toHaveBeenCalled();
  });

  it('should check if services are registered', () => {
    // initially not registered (or reset)
    expect(areServicesRegistered()).toBe(false);

    registerServices();
    expect(areServicesRegistered()).toBe(true);
  });
});
