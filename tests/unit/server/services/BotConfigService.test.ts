import { DatabaseManager } from '../../../../src/database/DatabaseManager';
import { BotConfigService } from '../../../../src/server/services/BotConfigService';
import { ConfigurationValidator } from '../../../../src/server/services/ConfigurationValidator';
import { ConfigurationError } from '../../../../src/types/errorClasses';

jest.mock('../../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      isConfigured: jest.fn().mockReturnValue(true),
      createBotConfiguration: jest.fn().mockResolvedValue(1),
      getBotConfiguration: jest.fn(),
      getBotConfigurationByName: jest.fn(),
      getAllBotConfigurations: jest.fn().mockResolvedValue([]),
      getAllBotConfigurationsWithDetails: jest.fn().mockResolvedValue([]),
      updateBotConfiguration: jest.fn().mockResolvedValue(undefined),
      deleteBotConfiguration: jest.fn().mockResolvedValue(true),
      createBotConfigurationAudit: jest.fn().mockResolvedValue(1),
      getBotConfigurationAudit: jest.fn().mockResolvedValue([]),
      getBotConfigurationVersions: jest.fn().mockResolvedValue([]),
      createBotConfigurationVersion: jest.fn().mockResolvedValue(1),
    }),
    instance: null,
  },
}));
jest.mock('../../../../src/server/services/ConfigurationValidator', () => ({
  ConfigurationValidator: jest.fn().mockImplementation(() => ({
    validateBotConfig: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    }),
  })),
}));

describe('BotConfigService', () => {
  let service: BotConfigService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockValidator: jest.Mocked<ConfigurationValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    (BotConfigService as any).instance = null;

    // Get mock references from the mocked module (factory provides defaults)
    mockDbManager = DatabaseManager.getInstance() as any;

    // Reset mock implementations after clearAllMocks
    mockDbManager.isConfigured.mockReturnValue(true);
    mockDbManager.createBotConfiguration.mockResolvedValue(1);
    mockDbManager.getBotConfiguration.mockResolvedValue(null);
    mockDbManager.getBotConfigurationByName.mockResolvedValue(null);
    mockDbManager.getAllBotConfigurations.mockResolvedValue([]);
    mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue([]);
    mockDbManager.updateBotConfiguration.mockResolvedValue(undefined);
    mockDbManager.deleteBotConfiguration.mockResolvedValue(true);
    mockDbManager.createBotConfigurationAudit.mockResolvedValue(1);
    mockDbManager.getBotConfigurationAudit.mockResolvedValue([]);
    mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
    mockDbManager.createBotConfigurationVersion.mockResolvedValue(1);

    // Mock ConfigurationValidator
    mockValidator = {
      validateBotConfig: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      }),
    } as any;

    (ConfigurationValidator as jest.Mock).mockImplementation(() => mockValidator);

    service = BotConfigService.getInstance();

    // Override the private dbManager with our mock after construction
    (service as any).dbManager = mockDbManager;
    (service as any).configValidator = mockValidator;
  });

  afterEach(() => {
    (BotConfigService as any).instance = null;
  });

  describe('initialization', () => {
    test('should return singleton instance', () => {
      const instance1 = BotConfigService.getInstance();
      const instance2 = BotConfigService.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('should throw error when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);

      await expect(
        service.createBotConfig({
          name: 'test',
          messageProvider: 'discord',
          llmProvider: 'openai',
        })
      ).rejects.toThrow(ConfigurationError);
    });
  });

  describe('createBotConfig', () => {
    test('should create valid bot configuration', async () => {
      const configData = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'test-token' },
        openai: { apiKey: 'test-key' },
      };

      const mockCreatedConfig = {
        id: 1,
        ...configData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(mockCreatedConfig as any);

      const result = await service.createBotConfig(configData, 'user-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('test-bot');
      expect(mockDbManager.createBotConfiguration).toHaveBeenCalled();
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE' })
      );
    });

    test('should reject invalid configuration', async () => {
      mockValidator.validateBotConfig.mockReturnValue({
        isValid: false,
        errors: ['Invalid configuration'],
        warnings: [],
        suggestions: [],
      });

      await expect(
        service.createBotConfig({
          name: '',
          messageProvider: 'invalid',
          llmProvider: 'invalid',
        })
      ).rejects.toThrow('Configuration validation failed');
    });

    test('should reject duplicate bot name', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue({
        id: 1,
        name: 'existing-bot',
      } as any);

      await expect(
        service.createBotConfig({
          name: 'existing-bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
        })
      ).rejects.toThrow('already exists');
    });

    test('should serialize complex config objects', async () => {
      const configData = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'test-token', channelId: 'channel-123' },
        mcpServers: ['server1', 'server2'],
        mcpGuard: { enabled: true, type: 'owner' as const },
      };

      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...configData } as any);

      await service.createBotConfig(configData);

      expect(mockDbManager.createBotConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          discord: expect.any(String),
          mcpServers: expect.any(String),
          mcpGuard: expect.any(String),
        })
      );
    });
  });

  describe('getBotConfig', () => {
    test('should retrieve bot configuration with details', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue([]);

      const result = await service.getBotConfig(1);

      expect(result).toBeDefined();
      expect(result?.name).toBe('test-bot');
      expect(result?.versions).toBeDefined();
      expect(result?.auditLog).toBeDefined();
    });

    test('should return null for non-existent configuration', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      const result = await service.getBotConfig(999);

      expect(result).toBeNull();
    });
  });

  describe('getBotConfigByName', () => {
    test('should retrieve bot configuration by name', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockDbManager.getBotConfigurationByName.mockResolvedValue(mockConfig as any);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue([]);

      const result = await service.getBotConfigByName('test-bot');

      expect(result).toBeDefined();
      expect(result?.name).toBe('test-bot');
    });

    test('should return null for non-existent name', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);

      const result = await service.getBotConfigByName('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllBotConfigs', () => {
    test('should use optimized bulk query', async () => {
      const mockConfigs = [
        { id: 1, name: 'bot-1', messageProvider: 'discord', llmProvider: 'openai' },
        { id: 2, name: 'bot-2', messageProvider: 'slack', llmProvider: 'flowise' },
      ];

      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue(mockConfigs as any);

      const result = await service.getAllBotConfigs();

      expect(result).toHaveLength(2);
      expect(mockDbManager.getAllBotConfigurationsWithDetails).toHaveBeenCalled();
    });
  });

  describe('getBotConfigsByProvider', () => {
    test('should filter by message provider', async () => {
      const mockConfigs = [
        { id: 1, name: 'bot-1', messageProvider: 'discord', llmProvider: 'openai' },
        { id: 2, name: 'bot-2', messageProvider: 'slack', llmProvider: 'openai' },
        { id: 3, name: 'bot-3', messageProvider: 'discord', llmProvider: 'flowise' },
      ];

      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue(mockConfigs as any);

      const result = await service.getBotConfigsByProvider('discord');

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.messageProvider === 'discord')).toBe(true);
    });
  });

  describe('updateBotConfig', () => {
    test('should update bot configuration', async () => {
      const existingConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updates = {
        name: 'updated-bot',
        persona: 'friendly',
      };

      mockDbManager.getBotConfiguration
        .mockResolvedValueOnce(existingConfig as any)
        .mockResolvedValueOnce({ ...existingConfig, ...updates } as any);

      const result = await service.updateBotConfig(1, updates, 'user-1');

      expect(result).toBeDefined();
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalled();
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE' })
      );
    });

    test('should throw error for non-existent configuration', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(service.updateBotConfig(999, { name: 'test' })).rejects.toThrow('not found');
    });

    test('should validate updated configuration', async () => {
      const existingConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(existingConfig as any);
      mockValidator.validateBotConfig.mockReturnValue({
        isValid: false,
        errors: ['Invalid update'],
        warnings: [],
        suggestions: [],
      });

      await expect(service.updateBotConfig(1, { messageProvider: 'invalid' })).rejects.toThrow(
        'validation failed'
      );
    });
  });

  describe('deleteBotConfig', () => {
    test('should delete bot configuration', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);
      mockDbManager.deleteBotConfiguration.mockResolvedValue(true);

      const result = await service.deleteBotConfig(1, 'user-1');

      expect(result).toBe(true);
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' })
      );
    });

    test('should throw error for non-existent configuration', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(service.deleteBotConfig(999)).rejects.toThrow('not found');
    });
  });

  describe('activateBotConfig', () => {
    test('should activate bot configuration', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        isActive: true,
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);

      const result = await service.activateBotConfig(1, 'user-1');

      expect(result).toBeDefined();
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isActive: true })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACTIVATE' })
      );
    });
  });

  describe('deactivateBotConfig', () => {
    test('should deactivate bot configuration', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        isActive: false,
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);

      const result = await service.deactivateBotConfig(1, 'user-1');

      expect(result).toBeDefined();
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isActive: false })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEACTIVATE' })
      );
    });
  });

  describe('createBotConfigVersion', () => {
    test('should create new version', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);

      const result = await service.createBotConfigVersion(1, 'Initial version', 'user-1');

      expect(result).toBeDefined();
      expect(result.version).toBe('1');
      expect(mockDbManager.createBotConfigurationVersion).toHaveBeenCalled();
    });

    test('should increment version number', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const mockVersions = [
        { version: '1', id: 1 },
        { version: '2', id: 2 },
      ];

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.createBotConfigVersion(1, 'Version 3', 'user-1');

      expect(result.version).toBe('3');
    });

    test('should throw error for non-existent configuration', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(service.createBotConfigVersion(999, 'test')).rejects.toThrow('not found');
    });
  });

  describe('getConfigStats', () => {
    test('should return configuration statistics', async () => {
      const mockConfigs = [
        { id: 1, messageProvider: 'discord', llmProvider: 'openai', isActive: true },
        { id: 2, messageProvider: 'discord', llmProvider: 'flowise', isActive: true },
        { id: 3, messageProvider: 'slack', llmProvider: 'openai', isActive: false },
      ];

      mockDbManager.getAllBotConfigurations.mockResolvedValue(mockConfigs as any);

      const stats = await service.getConfigStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.byProvider).toEqual({ discord: 2, slack: 1 });
      expect(stats.byLlmProvider).toEqual({ openai: 2, flowise: 1 });
    });

    test('should handle empty configurations', async () => {
      mockDbManager.getAllBotConfigurations.mockResolvedValue([]);

      const stats = await service.getConfigStats();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.inactive).toBe(0);
    });
  });

  describe('validateBotConfig', () => {
    test('should validate bot configuration', async () => {
      const configData = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const result = await service.validateBotConfig(configData);

      expect(result.isValid).toBe(true);
      expect(mockValidator.validateBotConfig).toHaveBeenCalledWith(configData);
    });

    test('should handle validation errors', async () => {
      mockValidator.validateBotConfig.mockReturnValue({
        isValid: false,
        errors: ['Invalid config'],
        warnings: [],
        suggestions: [],
      });

      const result = await service.validateBotConfig({
        name: '',
        messageProvider: 'invalid',
        llmProvider: 'invalid',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle validation exceptions', async () => {
      mockValidator.validateBotConfig.mockImplementation(() => {
        throw new Error('Validation exception');
      });

      const result = await service.validateBotConfig({
        name: 'test',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Validation exception');
    });
  });

  describe('edge cases', () => {
    test('should handle null provider configs', async () => {
      const configData = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: null,
        openai: null,
      };

      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...configData } as any);

      await expect(service.createBotConfig(configData as any)).resolves.toBeDefined();
    });

    test('should handle undefined optional fields', async () => {
      const configData = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...configData } as any);

      await expect(service.createBotConfig(configData)).resolves.toBeDefined();
    });

    test('should handle empty arrays', async () => {
      const configData = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
      };

      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...configData } as any);

      await expect(service.createBotConfig(configData)).resolves.toBeDefined();
    });
  });
});
