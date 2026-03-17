import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerServices } from '../../../src/di/registration';
import Logger from '../../../src/common/logger';

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
  ProviderConfigManager: {
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
    withContext: jest.fn().mockReturnValue(mockLogger),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

describe('DI Service Registration Logging', () => {
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    container.reset();
    mockLogger = (Logger.withContext as jest.Mock)();
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
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering BotConfigurationManager class');
<<<<<<< HEAD
<<<<<<< HEAD
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Registering UserConfigStore (re-registering instance)'
    );
=======
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering UserConfigStore (re-registering instance)');
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering UserConfigStore (re-registering instance)');
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering ProviderConfigManager');

    // Verify completion log (info level)
    expect(mockLogger.info).toHaveBeenCalledWith('✅ DI services registered');
  });
});
