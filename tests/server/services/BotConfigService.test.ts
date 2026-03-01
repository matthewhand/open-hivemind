import { BotConfiguration, DatabaseManager } from '../../../src/database/DatabaseManager';
import {
  BotConfigService,
  CreateBotConfigRequest,
  UpdateBotConfigRequest,
} from '../../../src/server/services/BotConfigService';
import { ConfigurationValidator } from '../../../src/server/services/ConfigurationValidator';

// Mock dependencies
jest.mock('../../../src/database/DatabaseManager');
jest.mock('../../../src/server/services/ConfigurationValidator');

describe('BotConfigService', () => {
  let botConfigService: BotConfigService;
  let mockDbManager: any;
  let mockValidator: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup DatabaseManager mock
    mockDbManager = {
      isConfigured: jest.fn().mockReturnValue(true),
      getBotConfigurationByName: jest.fn(),
      createBotConfiguration: jest.fn(),
      createBotConfigurationAudit: jest.fn(),
      getBotConfiguration: jest.fn(),
      getBotConfigurationVersions: jest.fn(),
      getBotConfigurationAudit: jest.fn(),
      getAllBotConfigurationsWithDetails: jest.fn(),
      updateBotConfiguration: jest.fn(),
      deleteBotConfiguration: jest.fn(),
      createBotConfigurationVersion: jest.fn(),
      getAllBotConfigurations: jest.fn(),
    };

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);

    // Setup ConfigurationValidator mock
    mockValidator = {
      validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    };

    (ConfigurationValidator as jest.Mock).mockImplementation(() => mockValidator);

    // Ensure the new ConfigurationValidator() call inside BotConfigService constructor
    // returns our mock object rather than the default mock function
    (ConfigurationValidator as jest.Mock).mockReturnValue(mockValidator);

    // We must reset the BotConfigService instance so it rebuilds itself and picks up the latest DatabaseManager and ConfigurationValidator mocks.
    // @ts-expect-error - accessing private static for testing purposes
    BotConfigService.instance = undefined;

    // Get instance (singleton)
    botConfigService = BotConfigService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = BotConfigService.getInstance();
      const instance2 = BotConfigService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createBotConfig', () => {
    const validConfig: CreateBotConfigRequest = {
      name: 'TestBot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      openai: { apiKey: 'sk-test' },
    };

    it('should create a bot configuration successfully', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);
      mockDbManager.createBotConfiguration.mockResolvedValue(1);
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...validConfig });

      const result = await botConfigService.createBotConfig(validConfig, 'user');

      expect(mockValidator.validateBotConfig).toHaveBeenCalledWith(validConfig);
      expect(mockDbManager.getBotConfigurationByName).toHaveBeenCalledWith('TestBot');
      expect(mockDbManager.createBotConfiguration).toHaveBeenCalled();
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          action: 'CREATE',
          performedBy: 'user',
        })
      );
      expect(result).toEqual(expect.objectContaining({ id: 1, name: 'TestBot' }));
    });

    it('should throw error if database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);

      await expect(botConfigService.createBotConfig(validConfig)).rejects.toThrow(
        'Database is not configured'
      );
    });

    it('should throw error if validation fails', async () => {
      mockValidator.validateBotConfig.mockReturnValue({
        isValid: false,
        errors: ['Invalid config'],
      });

      await expect(botConfigService.createBotConfig(validConfig)).rejects.toThrow(
        'Configuration validation failed'
      );
    });

    it('should throw error if bot name already exists', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue({ id: 1, name: 'TestBot' });

      await expect(botConfigService.createBotConfig(validConfig)).rejects.toThrow(
        "Bot configuration with name 'TestBot' already exists"
      );
    });
  });

  describe('getBotConfig', () => {
    it('should return bot config with details', async () => {
      const mockConfig = { id: 1, name: 'TestBot' };
      const mockVersions = [{ version: '1' }];
      const mockAudit = [{ action: 'CREATE' }];

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue(mockAudit);

      const result = await botConfigService.getBotConfig(1);

      expect(result).toEqual({
        ...mockConfig,
        versions: mockVersions,
        auditLog: mockAudit,
      });
    });

    it('should return null if config not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      const result = await botConfigService.getBotConfig(999);

      expect(result).toBeNull();
    });
  });

  describe('getBotConfigByName', () => {
    it('should return bot config with details by name', async () => {
      const mockConfig = { id: 1, name: 'TestBot' };
      const mockVersions = [{ version: '1' }];
      const mockAudit = [{ action: 'CREATE' }];

      mockDbManager.getBotConfigurationByName.mockResolvedValue(mockConfig);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue(mockAudit);

      const result = await botConfigService.getBotConfigByName('TestBot');

      expect(result).toEqual({
        ...mockConfig,
        versions: mockVersions,
        auditLog: mockAudit,
      });
    });

    it('should return null if config not found by name', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);

      const result = await botConfigService.getBotConfigByName('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllBotConfigs', () => {
    it('should return all bot configs with details', async () => {
      const mockConfigs = [
        { id: 1, name: 'Bot1', versions: [], auditLog: [] },
        { id: 2, name: 'Bot2', versions: [], auditLog: [] },
      ];
      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue(mockConfigs);

      const result = await botConfigService.getAllBotConfigs();

      expect(result).toEqual(mockConfigs);
      expect(mockDbManager.getAllBotConfigurationsWithDetails).toHaveBeenCalled();
    });
  });

  describe('getBotConfigsByProvider', () => {
    it('should return bot configs filtered by message provider', async () => {
      const mockConfigs = [
        { id: 1, name: 'Bot1', messageProvider: 'discord', versions: [], auditLog: [] },
        { id: 2, name: 'Bot2', messageProvider: 'slack', versions: [], auditLog: [] },
        { id: 3, name: 'Bot3', messageProvider: 'discord', versions: [], auditLog: [] },
      ];
      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue(mockConfigs);

      const result = await botConfigService.getBotConfigsByProvider('discord');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Bot1');
      expect(result[1].name).toBe('Bot3');
      expect(mockDbManager.getAllBotConfigurationsWithDetails).toHaveBeenCalled();
    });

    it('should return empty array if no configs match the provider', async () => {
      const mockConfigs = [
        { id: 1, name: 'Bot1', messageProvider: 'discord', versions: [], auditLog: [] },
      ];
      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue(mockConfigs);

      const result = await botConfigService.getBotConfigsByProvider('slack');

      expect(result).toHaveLength(0);
      expect(mockDbManager.getAllBotConfigurationsWithDetails).toHaveBeenCalled();
    });
  });

  describe('updateBotConfig', () => {
    const updateReq: UpdateBotConfigRequest = { name: 'UpdatedBot' };
    const existingConfig: BotConfiguration = {
      id: 1,
      name: 'TestBot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add other required fields with defaults/mocks
    } as any;

    it('should update bot config successfully', async () => {
      mockDbManager.getBotConfiguration
        .mockResolvedValueOnce(existingConfig) // for checking existence
        .mockResolvedValueOnce({ ...existingConfig, ...updateReq }); // for returning updated

      const result = await botConfigService.updateBotConfig(1, updateReq, 'user');

      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ updatedBy: 'user' })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          action: 'UPDATE',
          performedBy: 'user',
        })
      );
      expect(result.name).toBe('UpdatedBot');
    });

    it('should throw error if config not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(botConfigService.updateBotConfig(1, updateReq)).rejects.toThrow(
        'Bot configuration with ID 1 not found'
      );
    });
  });

  describe('deleteBotConfig', () => {
    it('should delete bot config successfully', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'TestBot' });
      mockDbManager.deleteBotConfiguration.mockResolvedValue(true);

      const result = await botConfigService.deleteBotConfig(1, 'user');

      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          action: 'DELETE',
          performedBy: 'user',
        })
      );
      expect(mockDbManager.deleteBotConfiguration).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should throw error if config not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(botConfigService.deleteBotConfig(1)).rejects.toThrow(
        'Bot configuration with ID 1 not found'
      );
    });
  });

  describe('activateBotConfig', () => {
    it('should activate bot config', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, isActive: true });

      await botConfigService.activateBotConfig(1, 'user');

      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isActive: true, updatedBy: 'user' })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          action: 'ACTIVATE',
          performedBy: 'user',
        })
      );
    });
  });

  describe('deactivateBotConfig', () => {
    it('should deactivate bot config', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, isActive: false });

      await botConfigService.deactivateBotConfig(1, 'user');

      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isActive: false, updatedBy: 'user' })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          action: 'DEACTIVATE',
          performedBy: 'user',
        })
      );
    });
  });

  describe('createBotConfigVersion', () => {
    it('should create a new version', async () => {
      const currentConfig = {
        id: 1,
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };
      mockDbManager.getBotConfiguration.mockResolvedValue(currentConfig);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([{ version: '1' }]);
      mockDbManager.createBotConfigurationVersion.mockResolvedValue(2);

      const result = await botConfigService.createBotConfigVersion(1, 'change log', 'user');

      expect(mockDbManager.createBotConfigurationVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          botConfigurationId: 1,
          version: '2',
          name: 'TestBot',
          createdBy: 'user',
        })
      );
      expect(result.id).toBe(2);
      expect(result.version).toBe('2');
    });

    it('should use version 1 if no versions exist', async () => {
      const currentConfig = { id: 1, name: 'TestBot' };
      mockDbManager.getBotConfiguration.mockResolvedValue(currentConfig);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.createBotConfigurationVersion.mockResolvedValue(1);

      const result = await botConfigService.createBotConfigVersion(1);

      expect(result.version).toBe('1');
    });
  });

  describe('getConfigStats', () => {
    it('should calculate stats correctly', async () => {
      const configs = [
        { isActive: true, messageProvider: 'discord', llmProvider: 'openai' },
        { isActive: true, messageProvider: 'slack', llmProvider: 'anthropic' },
        { isActive: false, messageProvider: 'discord', llmProvider: 'openai' },
      ];
      mockDbManager.getAllBotConfigurations.mockResolvedValue(configs);

      const stats = await botConfigService.getConfigStats();

      expect(stats).toEqual({
        total: 3,
        active: 2,
        inactive: 1,
        byProvider: { discord: 2, slack: 1 },
        byLlmProvider: { openai: 2, anthropic: 1 },
      });
    });
  });

  describe('validateBotConfig', () => {
    it('should return validation result', async () => {
      const result = await botConfigService.validateBotConfig({ name: 'Test' } as any);
      expect(result.isValid).toBe(true);
      expect(mockValidator.validateBotConfig).toHaveBeenCalled();
    });
  });
});
