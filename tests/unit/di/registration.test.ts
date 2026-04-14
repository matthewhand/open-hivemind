import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerServices, areServicesRegistered, TOKENS } from '../../../src/di/registration';

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
  ProviderConfigManager: {
    getInstance: jest.fn().mockReturnValue({ syncBotProviders: jest.fn() }),
  },
  default: {
    getInstance: jest.fn().mockReturnValue({ syncBotProviders: jest.fn() }),
  }
}));

jest.mock('../../../src/common/logger', () => {
  const logger = (global as any).mockLogger;
  return {
    __esModule: true,
    default: {
      info: (msg: string) => logger.info(msg),
      error: (msg: string) => logger.error(msg),
      warn: (msg: string) => logger.warn(msg),
      debug: (msg: string) => logger.debug(msg),
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
