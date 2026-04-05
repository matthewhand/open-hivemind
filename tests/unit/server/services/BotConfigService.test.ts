import { BotConfigService } from '../../../../src/server/services/BotConfigService';
import { DatabaseManager } from '../../../../src/database/DatabaseManager';
import { ConfigurationValidator } from '../../../../src/server/services/ConfigurationValidator';

// Mock DatabaseManager
jest.mock('../../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(),
  },
}));

// Mock ConfigurationValidator
jest.mock('../../../../src/server/services/ConfigurationValidator', () => ({
  ConfigurationValidator: jest.fn().mockImplementation(() => ({
    validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  })),
}));

describe('BotConfigService', () => {
  let mockDbManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (BotConfigService as any).instance = undefined;

    mockDbManager = {
      isConfigured: jest.fn().mockReturnValue(true),
      getBotConfigurationByName: jest.fn().mockResolvedValue(null),
      createBotConfiguration: jest.fn().mockResolvedValue(1),
      getBotConfiguration: jest.fn(),
      getBotConfigurationVersions: jest.fn().mockResolvedValue([]),
      getBotConfigurationAudit: jest.fn().mockResolvedValue([]),
      createBotConfigurationAudit: jest.fn().mockResolvedValue(undefined),
      getAllBotConfigurations: jest.fn(),
      updateBotConfiguration: jest.fn(),
      deleteBotConfiguration: jest.fn(),
    };

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = BotConfigService.getInstance();
      const instance2 = BotConfigService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create instance with DatabaseManager', () => {
      const service = BotConfigService.getInstance();
      expect(service).toBeDefined();
    });
  });
});
