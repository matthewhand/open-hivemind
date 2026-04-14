import { BotConfigService } from '../../../../src/server/services/BotConfigService';
import { DatabaseManager } from '../../../../src/database/DatabaseManager';
import { ConfigurationError } from '../../../../src/types/errorClasses';

// Use a shared mock object for database
(global as any).mockDb = {
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

// CRITICAL: Define the mock BEFORE imports if possible, or ensure it's robust
jest.mock('../../../../src/database/DatabaseManager', () => {
  return {
    DatabaseManager: {
      getInstance: jest.fn(() => ({
        isConfigured: () => (global as any).mockDb.isConfigured(),
        configured: true, // Internal property used by some methods
        ensureConnected: () => {}, // Method used by repositories
        getBotConfigurationByName: (name: string) => (global as any).mockDb.getBotConfigurationByName(name),
        createBotConfiguration: (data: any) => (global as any).mockDb.createBotConfiguration(data),
        getBotConfiguration: (id: any) => (global as any).mockDb.getBotConfiguration(id),
        getBotConfigurationVersions: (id: any) => (global as any).mockDb.getBotConfigurationVersions(id),
        getBotConfigurationAudit: (id: any) => (global as any).mockDb.getBotConfigurationAudit(id),
        createBotConfigurationAudit: (data: any) => (global as any).mockDb.createBotConfigurationAudit(data),
        getAllBotConfigurations: () => (global as any).mockDb.getAllBotConfigurations(),
        updateBotConfiguration: (id: any, data: any) => (global as any).mockDb.updateBotConfiguration(id, data),
        deleteBotConfiguration: (id: any) => (global as any).mockDb.deleteBotConfiguration(id),
      })),
    },
  };
});

jest.mock('../../../../src/server/services/ConfigurationValidator', () => ({
  ConfigurationValidator: jest.fn().mockImplementation(() => ({
    validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  })),
}));

describe('BotConfigService', () => {
  let service: BotConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    BotConfigService.resetInstance();
    service = BotConfigService.getInstance();
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
      openai: { apiKey: 'test-key' },
      discord: { botToken: 'test-token' }
    };

    it('should create a bot configuration successfully', async () => {
      const result = await service.createBotConfig(validConfig as any);
      expect(result).toBeDefined();
      expect((global as any).mockDb.createBotConfiguration).toHaveBeenCalled();
    });

    it('should throw when bot name already exists', async () => {
      (global as any).mockDb.getBotConfigurationByName.mockResolvedValue({ id: 1, name: 'test-bot' });

      await expect(service.createBotConfig(validConfig as any)).rejects.toThrow(
        "Bot configuration with name 'test-bot' already exists"
      );
    });
  });

  describe('getBotConfig', () => {
    it('should return null when configuration not found', async () => {
      (global as any).mockDb.getBotConfiguration.mockResolvedValue(null);
      const result = await service.getBotConfig(999);
      expect(result).toBeNull();
    });
  });

  describe('getBotConfigByName', () => {
    it('should return null when not found', async () => {
      (global as any).mockDb.getBotConfigurationByName.mockResolvedValue(null);
      const result = await service.getBotConfigByName('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteBotConfig', () => {
    it('should throw when configuration not found', async () => {
      (global as any).mockDb.getBotConfiguration.mockResolvedValue(null);
      await expect(service.deleteBotConfig(999)).rejects.toThrow(
        'Bot configuration with ID 999 not found'
      );
    });
  });
});
