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
  });

  describe('createBotConfig', () => {
    const validConfig = {
      name: 'test-bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'helpful-assistant',
      mcpServers: ['server1', 'server2'],
      mcpGuard: { enabled: true, type: 'owner' as const },
      openai: { apiKey: 'sk-test-key', model: 'gpt-4' },
    };

    it('should throw when bot name already exists', async () => {
      const service = BotConfigService.getInstance();
      mockDbManager.getBotConfigurationByName.mockResolvedValue({ id: 1, name: 'test-bot' });

      await expect(service.createBotConfig(validConfig)).rejects.toThrow(
        "Bot configuration with name 'test-bot' already exists"
      );
    });

    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);
      const service = BotConfigService.getInstance();

      await expect(service.createBotConfig(validConfig)).rejects.toThrow(
        'Database is not configured'
      );
    });
  });

  describe('getBotConfig', () => {
    it('should return null when configuration not found', async () => {
      mockDbManager.isConfigured.mockReturnValue(true);
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      const service = BotConfigService.getInstance();

      const result = await service.getBotConfig(999);

      expect(result).toBeNull();
    });

    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);
      const service = BotConfigService.getInstance();

      await expect(service.getBotConfig(1)).rejects.toThrow('Database is not configured');
    });
  });

  describe('getBotConfigByName', () => {
    it('should return null when not found', async () => {
      mockDbManager.isConfigured.mockReturnValue(true);
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);
      const service = BotConfigService.getInstance();

      const result = await service.getBotConfigByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllBotConfigs', () => {
    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);
      const service = BotConfigService.getInstance();

      await expect(service.getAllBotConfigs()).rejects.toThrow('Database is not configured');
    });
  });

  describe('deleteBotConfig', () => {
    it('should throw when configuration not found', async () => {
      mockDbManager.isConfigured.mockReturnValue(true);
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      const service = BotConfigService.getInstance();

      await expect(service.deleteBotConfig(999)).rejects.toThrow(
        'Bot configuration with ID 999 not found'
      );
    });
  });
});
