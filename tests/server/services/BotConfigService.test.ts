
import { BotConfiguration, DatabaseManager } from '../../../src/database/DatabaseManager';
import { BotConfigService, CreateBotConfigRequest, UpdateBotConfigRequest } from '../../../src/server/services/BotConfigService';
import { ConfigurationError } from '../../../src/types/errorClasses';
import { ConfigurationValidator } from '../../../src/server/services/ConfigurationValidator';

jest.mock('../../../src/database/DatabaseManager');
jest.mock('../../../src/server/services/ConfigurationValidator');

describe('BotConfigService', () => {
  let botConfigService: BotConfigService;
  let mockDbManager: any;
  let mockValidator: any;

  beforeEach(() => {
    jest.clearAllMocks();

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

    mockValidator = {
      validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    };
    (ConfigurationValidator as jest.Mock).mockImplementation(() => mockValidator);
    (ConfigurationValidator as jest.Mock).mockReturnValue(mockValidator);

    // @ts-expect-error
    BotConfigService.instance = undefined;
    botConfigService = BotConfigService.getInstance();
    botConfigService['dbManager'] = mockDbManager;
    botConfigService['configValidator'] = mockValidator;
  });

  describe('Database not configured errors (Error Paths)', () => {
    beforeEach(() => {
      mockDbManager.isConfigured.mockReturnValue(false);
    });

    it('should throw ConfigurationError on createBotConfig', async () => {
      await expect(botConfigService.createBotConfig({} as any)).rejects.toThrow(ConfigurationError);
      await expect(botConfigService.createBotConfig({} as any)).rejects.toThrow(/Database is not configured/);
    });

    it('should throw ConfigurationError on getBotConfig', async () => {
      await expect(botConfigService.getBotConfig(1)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on getBotConfigByName', async () => {
      await expect(botConfigService.getBotConfigByName('name')).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on getAllBotConfigs', async () => {
      await expect(botConfigService.getAllBotConfigs()).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on getBotConfigsByProvider', async () => {
      await expect(botConfigService.getBotConfigsByProvider('discord')).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on updateBotConfig', async () => {
      await expect(botConfigService.updateBotConfig(1, {} as any)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on deleteBotConfig', async () => {
      await expect(botConfigService.deleteBotConfig(1)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on activateBotConfig', async () => {
      await expect(botConfigService.activateBotConfig(1)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on deactivateBotConfig', async () => {
      await expect(botConfigService.deactivateBotConfig(1)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on createBotConfigVersion', async () => {
      await expect(botConfigService.createBotConfigVersion(1)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError on getConfigStats', async () => {
      await expect(botConfigService.getConfigStats()).rejects.toThrow(ConfigurationError);
    });
  });

  describe('createBotConfig', () => {
    const validReq: CreateBotConfigRequest = {
      name: 'NewBot',
      messageProvider: 'discord',
      llmProvider: 'openai',
    };

    it('should create bot config successfully', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);
      mockDbManager.createBotConfiguration.mockResolvedValue(1);
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...validReq });
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue([]);

      const result = await botConfigService.createBotConfig(validReq, 'user');

      expect(mockDbManager.createBotConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'NewBot', createdBy: 'user' })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', performedBy: 'user' })
      );
      expect(result.id).toBe(1);
    });

    it('should throw error if config with same name exists', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue({ id: 1, name: 'NewBot' });

      await expect(botConfigService.createBotConfig(validReq)).rejects.toThrow(
        "Bot configuration with name 'NewBot' already exists"
      );
    });

    it('should throw error if validation fails (Error Path)', async () => {
       mockValidator.validateBotConfig.mockReturnValue({ isValid: false, errors: ['Missing provider'] });

       await expect(botConfigService.createBotConfig(validReq)).rejects.toThrow(/Configuration validation failed/);
    });

    it('should handle null fetched config after creation', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);
      mockDbManager.createBotConfiguration.mockResolvedValue(1);
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(botConfigService.createBotConfig(validReq, 'user')).rejects.toThrow('Failed to retrieve created bot configuration');
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
    });

    it('should return empty array if no configs match the provider', async () => {
      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue([{ messageProvider: 'discord' }]);
      const result = await botConfigService.getBotConfigsByProvider('slack');
      expect(result).toHaveLength(0);
    });
  });

  describe('updateBotConfig', () => {
    const updateReq: UpdateBotConfigRequest = { name: 'UpdatedBot' };
    const existingConfig = {
      id: 1,
      name: 'TestBot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      isActive: true,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    } as any;

    it('should update bot config successfully', async () => {
      mockDbManager.getBotConfiguration
        .mockResolvedValueOnce(existingConfig) // for checking existence
        .mockResolvedValueOnce({ ...existingConfig, ...updateReq }); // for returning updated

      const result = await botConfigService.updateBotConfig(1, updateReq, 'user');
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalled();
      expect(result.name).toBe('UpdatedBot');
    });

    it('should throw error if config not found (Error Path)', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      await expect(botConfigService.updateBotConfig(1, updateReq)).rejects.toThrow('Bot configuration with ID 1 not found');
    });

    it('should handle undefined values when updating specific fields', async () => {
      mockDbManager.getBotConfiguration
        .mockResolvedValueOnce(existingConfig)
        .mockResolvedValueOnce({ ...existingConfig, ...updateReq });

      const updateWithSpecificFields: UpdateBotConfigRequest = {
        name: 'UpdatedBot',
        mcpGuard: { enabled: true, type: 'owner' },
        discord: { token: 'newtoken' },
        slack: { botToken: 'slacktoken', signingSecret: 'secret' },
        mattermost: { botToken: 'mmtoken', url: 'mmurl' },
        openai: { apiKey: 'openaikey' },
        flowise: { endpoint: 'flowise', apiKey: 'flowisekey' },
        openwebui: { endpoint: 'openwebui', token: 'openwebuitoken' },
        openswarm: { endpoint: 'openswarm', apiKey: 'openswarmkey' }
      };

      const result = await botConfigService.updateBotConfig(1, updateWithSpecificFields, 'user');
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalled();

      const updateCallArgs = mockDbManager.updateBotConfiguration.mock.calls[0][1];
      expect(updateCallArgs.mcpGuard).toBeDefined();
      expect(updateCallArgs.discord).toBeDefined();
      expect(updateCallArgs.slack).toBeDefined();
      expect(updateCallArgs.mattermost).toBeDefined();
      expect(updateCallArgs.openai).toBeDefined();
      expect(updateCallArgs.flowise).toBeDefined();
      expect(updateCallArgs.openwebui).toBeDefined();
      expect(updateCallArgs.openswarm).toBeDefined();
    });

    it('should handle undefined and falsey values gracefully without overwriting existing data if undefined', async () => {
      mockDbManager.getBotConfiguration
        .mockResolvedValueOnce(existingConfig)
        .mockResolvedValueOnce(existingConfig);

      const updateWithFalsyFields: UpdateBotConfigRequest = {
        name: 'UpdatedBot',
        mcpGuard: undefined,
        discord: undefined,
        slack: undefined,
        mattermost: undefined,
        openai: undefined,
        flowise: undefined,
        openwebui: undefined,
        openswarm: undefined
      };

      const result = await botConfigService.updateBotConfig(1, updateWithFalsyFields, 'user');
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalled();

      const updateCallArgs = mockDbManager.updateBotConfiguration.mock.calls[0][1];
      expect(updateCallArgs.mcpGuard).toBeUndefined(); // we didn't specify so it shouldn't be added to updateData keys
    });

    it('should throw error if updated bot config is null after update (Error Path)', async () => {
      mockDbManager.getBotConfiguration
        .mockResolvedValueOnce(existingConfig)
        .mockResolvedValueOnce(null);

      await expect(botConfigService.updateBotConfig(1, updateReq, 'user')).rejects.toThrow('Failed to retrieve updated bot configuration');
    });

    it('should throw error if validation fails (Error Path)', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(existingConfig);
      mockValidator.validateBotConfig.mockReturnValue({ isValid: false, errors: ['Bad config'] });

      await expect(botConfigService.updateBotConfig(1, updateReq)).rejects.toThrow(/Configuration validation failed/);
    });
  });

  describe('deleteBotConfig', () => {
    it('should delete bot config successfully', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'TestBot' });
      mockDbManager.deleteBotConfiguration.mockResolvedValue(true);

      const result = await botConfigService.deleteBotConfig(1, 'user');
      expect(mockDbManager.deleteBotConfiguration).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should throw error if config not found (Error Path)', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      await expect(botConfigService.deleteBotConfig(1)).rejects.toThrow('Bot configuration with ID 1 not found');
    });
  });

  describe('activateBotConfig & deactivateBotConfig', () => {
    it('should activate bot config', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, isActive: true });
      await botConfigService.activateBotConfig(1, 'user');
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isActive: true })
      );
    });

    it('should throw error if activating non-existent config (Error Path)', async () => {
       mockDbManager.getBotConfiguration.mockResolvedValue(null);
       await expect(botConfigService.activateBotConfig(1)).rejects.toThrow('Failed to retrieve activated bot configuration');
    });

    it('should deactivate bot config', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, isActive: false });
      await botConfigService.deactivateBotConfig(1, 'user');
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isActive: false })
      );
    });

    it('should throw error if deactivating non-existent config (Error Path)', async () => {
       mockDbManager.getBotConfiguration.mockResolvedValue(null);
       await expect(botConfigService.deactivateBotConfig(1)).rejects.toThrow('Failed to retrieve deactivated bot configuration');
    });
  });

  describe('createBotConfigVersion', () => {
    it('should create a new version', async () => {
      const currentConfig = { id: 1, name: 'TestBot' };
      mockDbManager.getBotConfiguration.mockResolvedValue(currentConfig);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([{ version: '1' }]);
      mockDbManager.createBotConfigurationVersion.mockResolvedValue(2);

      const result = await botConfigService.createBotConfigVersion(1, 'log', 'user');
      expect(result.version).toBe('2');
    });

    it('should use version 1 if no versions exist', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1 });
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.createBotConfigurationVersion.mockResolvedValue(1);

      const result = await botConfigService.createBotConfigVersion(1);
      expect(result.version).toBe('1');
    });

    it('should throw error if config not found (Error Path)', async () => {
       mockDbManager.getBotConfiguration.mockResolvedValue(null);
       await expect(botConfigService.createBotConfigVersion(1)).rejects.toThrow('Bot configuration with ID 1 not found');
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
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
    });
  });

  describe('validateBotConfig', () => {
    it('should return validation result', async () => {
      mockValidator.validateBotConfig.mockReturnValue({ isValid: true, errors: [] });
      const result = await botConfigService.validateBotConfig({ name: 'Test' } as CreateBotConfigRequest);
      expect(result.isValid).toBe(true);
    });
  });
});
