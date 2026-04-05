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
  let service: BotConfigService;
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
    service = BotConfigService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = BotConfigService.getInstance();
      const instance2 = BotConfigService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('ensureDatabaseEnabled', () => {
    it('should throw when database is not configured', () => {
      mockDbManager.isConfigured.mockReturnValue(false);
      expect(() => (service as any).ensureDatabaseEnabled('test')).toThrow(
        'Database is not configured. Unable to test.'
      );
    });

    it('should not throw when database is configured', () => {
      mockDbManager.isConfigured.mockReturnValue(true);
      expect(() => (service as any).ensureDatabaseEnabled('test')).not.toThrow();
    });
  });

  describe('createBotConfig', () => {
    const validConfig = {
      name: 'test-bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'helpful-assistant',
      systemInstruction: 'You are a helpful assistant.',
      mcpServers: ['server1', 'server2'],
      mcpGuard: { enabled: true, type: 'owner' as const },
      openai: { apiKey: 'sk-test-key', model: 'gpt-4' },
    };

    it('should create a bot configuration successfully', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({
        id: 1,
        ...validConfig,
        mcpServers: JSON.stringify(validConfig.mcpServers),
        mcpGuard: JSON.stringify(validConfig.mcpGuard),
        openai: JSON.stringify(validConfig.openai),
        isActive: true,
      });

      const result = await service.createBotConfig(validConfig, 'admin');

      expect(result).toBeDefined();
      expect(mockDbManager.createBotConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          isActive: true,
        })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          action: 'CREATE',
          performedBy: 'admin',
        })
      );
    });

    it('should throw when bot name already exists', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue({ id: 1, name: 'test-bot' });

      await expect(service.createBotConfig(validConfig)).rejects.toThrow(
        "Bot configuration with name 'test-bot' already exists"
      );
    });

    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);

      await expect(service.createBotConfig(validConfig)).rejects.toThrow(
        'Database is not configured'
      );
    });

    it('should serialize array mcpServers to JSON string', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...validConfig });

      await service.createBotConfig(validConfig);

      expect(mockDbManager.createBotConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers: JSON.stringify(['server1', 'server2']),
        })
      );
    });
  });

  describe('getBotConfig', () => {
    it('should return configuration with versions and audit log', async () => {
      const mockConfig = { id: 1, name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([{ id: 1, version: 1 }]);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue([{ id: 1, action: 'CREATE' }]);

      const result = await service.getBotConfig(1);

      expect(result).toEqual({
        ...mockConfig,
        versions: [{ id: 1, version: 1 }],
        auditLog: [{ id: 1, action: 'CREATE' }],
      });
    });

    it('should return null when configuration not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      const result = await service.getBotConfig(999);

      expect(result).toBeNull();
    });

    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);

      await expect(service.getBotConfig(1)).rejects.toThrow('Database is not configured');
    });
  });

  describe('getBotConfigByName', () => {
    it('should return configuration when found', async () => {
      const mockConfig = { id: 1, name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockDbManager.getBotConfigurationByName.mockResolvedValue(mockConfig);

      const result = await service.getBotConfigByName('test-bot');

      expect(result).toEqual(mockConfig);
      expect(mockDbManager.getBotConfigurationByName).toHaveBeenCalledWith('test-bot');
    });

    it('should return null when not found', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);

      const result = await service.getBotConfigByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllBotConfigs', () => {
    it('should return all configurations', async () => {
      const mockConfigs = [
        { id: 1, name: 'bot1', messageProvider: 'discord' },
        { id: 2, name: 'bot2', messageProvider: 'slack' },
      ];
      mockDbManager.getAllBotConfigurations.mockResolvedValue(mockConfigs);

      const result = await service.getAllBotConfigs();

      expect(result).toEqual(mockConfigs);
    });

    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);

      await expect(service.getAllBotConfigs()).rejects.toThrow('Database is not configured');
    });
  });

  describe('updateBotConfig', () => {
    const updateData = {
      name: 'updated-bot',
      systemInstruction: 'New instructions',
      isActive: false,
    };

    it('should update configuration successfully', async () => {
      const existingConfig = { id: 1, name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockDbManager.getBotConfiguration.mockResolvedValue(existingConfig);
      mockDbManager.updateBotConfiguration.mockResolvedValue(true);
      mockDbManager.getBotConfiguration.mockResolvedValueOnce({
        ...existingConfig,
        ...updateData,
      });

      const result = await service.updateBotConfig(1, updateData, 'admin');

      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining(updateData),
        'admin'
      );
      expect(result).toBeDefined();
    });

    it('should throw when configuration not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(service.updateBotConfig(999, updateData)).rejects.toThrow(
        'Bot configuration with ID 999 not found'
      );
    });
  });

  describe('deleteBotConfig', () => {
    it('should delete configuration successfully', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'test-bot' });
      mockDbManager.deleteBotConfiguration.mockResolvedValue(true);

      await service.deleteBotConfig(1, 'admin');

      expect(mockDbManager.deleteBotConfiguration).toHaveBeenCalledWith(1);
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          action: 'DELETE',
          performedBy: 'admin',
        })
      );
    });

    it('should throw when configuration not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(service.deleteBotConfig(999)).rejects.toThrow(
        'Bot configuration with ID 999 not found'
      );
    });
  });
});
