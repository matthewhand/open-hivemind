import 'reflect-metadata';
import { container } from 'tsyringe';
import Logger from '../../../src/common/logger';
import { registerServices } from '../../../src/di/registration';

// Mock all singleton services to prevent real initialization
jest.mock('../../../src/config/ConfigurationManager', () => ({
  ConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({}),
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
  default: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock Logger
jest.mock('../../../src/common/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      withContext: jest.fn().mockReturnValue(mockLogger),
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('DI Service Registration Logging', () => {
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    container.reset();
    mockLogger = Logger.withContext('DI');
  });

  it('should log service registrations and completion', () => {
    registerServices();

    // Verify context
    expect(Logger.withContext).toHaveBeenCalledWith('DI');

    // Verify individual service registration logs (debug level)
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering ConfigurationManager');
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering BotConfigurationManager instance');
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering UserConfigStore');
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering SecureConfigManager');
    expect(mockLogger.warn).toHaveBeenCalledWith('BotConfigurationManager is being registered a second time (useClass); this will override the useValue registration above');
    expect(mockLogger.warn).toHaveBeenCalledWith('UserConfigStore is being registered a second time; this will override the first registration');
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering ProviderConfigManager');

    // Verify completion log (info level)
    expect(mockLogger.info).toHaveBeenCalledWith('✅ DI services registered');
  });

  it('should check if services are registered', () => {
    const { areServicesRegistered } = require('../../../src/di/registration');

    // initially not registered
    expect(areServicesRegistered()).toBe(false);

    // register
    registerServices();

    // should be registered
    expect(areServicesRegistered()).toBe(true);
  });
});
