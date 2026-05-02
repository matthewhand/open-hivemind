import { BotConfigService } from '../../../src/server/services/BotConfigService';
import { ConfigurationError } from '../../../src/types/errorClasses';

describe('BotConfigService', () => {
  let mockDbManager: any;
  let mockValidator: any;
  let service: BotConfigService;

  beforeEach(() => {
    // Reset singleton
    BotConfigService.resetInstance();

    mockDbManager = {
      isConfigured: jest.fn().mockReturnValue(true),
      createBotConfiguration: jest.fn(),
      getBotConfiguration: jest.fn(),
      getBotConfigurationByName: jest.fn(),
      getAllBotConfigurations: jest.fn(),
      getAllBotConfigurationsWithDetails: jest.fn(),
      updateBotConfiguration: jest.fn(),
      deleteBotConfiguration: jest.fn(),
      createBotConfigurationAudit: jest.fn(),
      getBotConfigurationVersions: jest.fn(),
      createBotConfigurationVersion: jest.fn(),
      getBotConfigurationAudit: jest.fn(),
    };

    mockValidator = {
      validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    };

    service = new BotConfigService(mockDbManager, mockValidator);
  });

  describe('createBotConfig', () => {
    const validRequest: any = {
      name: 'TestBot',
      messageProvider: 'discord',
      llmProvider: 'openai',
    };

    it('should create a bot configuration', async () => {
      mockDbManager.createBotConfiguration.mockResolvedValue(1);
      mockDbManager.getBotConfiguration.mockResolvedValue({
        id: 1,
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createBotConfig(validRequest, 'admin');

      expect(result.id).toBe(1);
      expect(result.name).toBe('TestBot');
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE' })
      );
    });

    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);
      await expect(service.createBotConfig(validRequest)).rejects.toThrow(ConfigurationError);
    });

    it('should throw when validation fails', async () => {
      mockValidator.validateBotConfig.mockReturnValue({
        isValid: false,
        errors: ['Name is required'],
      });
      await expect(service.createBotConfig(validRequest)).rejects.toThrow(ConfigurationError);
    });

    it('should throw on duplicate name', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue({ id: 2 });
      await expect(service.createBotConfig(validRequest)).rejects.toThrow(/already exists/);
    });

    it('should serialize complex fields to JSON', async () => {
      const request: any = {
        ...validRequest,
        mcpServers: ['server-1', 'server-2'],
        mcpGuard: { enabled: true, type: 'owner' },
        discord: { token: 'tok', channelId: 'ch' },
      };
      mockDbManager.createBotConfiguration.mockResolvedValue(1);
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'TestBot' });

      await service.createBotConfig(request);

      const call = mockDbManager.createBotConfiguration.mock.calls[0][0];
      expect(call.mcpServers).toBe(JSON.stringify(['server-1', 'server-2']));
      expect(call.mcpGuard).toBe(JSON.stringify({ enabled: true, type: 'owner' }));
      expect(call.discord).toBe(JSON.stringify({ token: 'tok', channelId: 'ch' }));
    });
  });

  describe('getBotConfig', () => {
    it('should return null when config not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      const result = await service.getBotConfig(999);
      expect(result).toBeNull();
    });

    it('should enrich response with versions and audit log', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({
        id: 1,
        name: 'TestBot',
      });
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([{ id: 1, version: '1.0.0' }]);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue([{ id: 1, action: 'CREATE' }]);

      const result = await service.getBotConfig(1);
      expect(result).not.toBeNull();
      expect(result!.versions).toHaveLength(1);
      expect(result!.auditLog).toHaveLength(1);
    });

    it('should throw when database is not configured', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);
      await expect(service.getBotConfig(1)).rejects.toThrow(ConfigurationError);
    });
  });

  describe('getBotConfigByName', () => {
    it('should return null when config not found', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue(null);
      const result = await service.getBotConfigByName('Unknown');
      expect(result).toBeNull();
    });

    it('should return null when config has no id', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue({ name: 'Bot' });
      const result = await service.getBotConfigByName('Bot');
      expect(result).toBeNull();
    });

    it('should enrich with versions and audit log', async () => {
      mockDbManager.getBotConfigurationByName.mockResolvedValue({
        id: 42,
        name: 'BotA',
      });
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.getBotConfigurationAudit.mockResolvedValue([]);

      const result = await service.getBotConfigByName('BotA');
      expect(result).not.toBeNull();
      expect(result!.id).toBe(42);
    });
  });

  describe('getAllBotConfigs', () => {
    it('should use bulk query method', async () => {
      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue([
        { id: 1, name: 'BotA' },
        { id: 2, name: 'BotB' },
      ]);

      const configs = await service.getAllBotConfigs();
      expect(configs).toHaveLength(2);
    });
  });

  describe('getBotConfigsByProvider', () => {
    it('should filter by message provider', async () => {
      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue([
        { id: 1, name: 'DiscordBot', messageProvider: 'discord' },
        { id: 2, name: 'SlackBot', messageProvider: 'slack' },
        { id: 3, name: 'DiscordBot2', messageProvider: 'discord' },
      ]);

      const configs = await service.getBotConfigsByProvider('discord');
      expect(configs).toHaveLength(2);
    });

    it('should return empty array when no match', async () => {
      mockDbManager.getAllBotConfigurationsWithDetails.mockResolvedValue([
        { id: 1, name: 'Bot', messageProvider: 'discord' },
      ]);

      const configs = await service.getBotConfigsByProvider('slack');
      expect(configs).toEqual([]);
    });
  });

  describe('updateBotConfig', () => {
    it('should throw when config not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      await expect(service.updateBotConfig(999, {})).rejects.toThrow(/not found/);
    });

    it('should validate and update', async () => {
      const existing = {
        id: 1,
        name: 'OldBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDbManager.getBotConfiguration
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: 1, name: 'UpdatedBot' });

      const result = await service.updateBotConfig(1, { name: 'UpdatedBot' }, 'admin');

      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalled();
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE' })
      );
      expect(result).not.toBeNull();
    });
  });

  describe('deleteBotConfig', () => {
    it('should throw when config not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      await expect(service.deleteBotConfig(999)).rejects.toThrow(/not found/);
    });

    it('should create audit log and delete', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({
        id: 1,
        name: 'Bot',
      });
      mockDbManager.deleteBotConfiguration.mockResolvedValue(true);

      const result = await service.deleteBotConfig(1, 'admin');

      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' })
      );
      expect(result).toBe(true);
    });

    it('should return false when delete operation returns false', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'Bot' });
      mockDbManager.deleteBotConfiguration.mockResolvedValue(false);

      const result = await service.deleteBotConfig(1);
      expect(result).toBe(false);
    });
  });

  describe('activateBotConfig', () => {
    it('should set isActive to true and create audit log', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'Bot' });

      const result = await service.activateBotConfig(1, 'admin');

      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          isActive: true,
        })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACTIVATE' })
      );
    });

    it('should throw when retrieval after activation fails', async () => {
      mockDbManager.getBotConfiguration.mockReset();
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(service.activateBotConfig(1)).rejects.toThrow(ConfigurationError);
    });
  });

  describe('deactivateBotConfig', () => {
    it('should set isActive to false and create audit log', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'Bot' });

      const result = await service.deactivateBotConfig(1, 'admin');

      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          isActive: false,
        })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEACTIVATE' })
      );
    });
  });

  describe('createBotConfigVersion', () => {
    it('should throw when config not found', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);
      await expect(service.createBotConfigVersion(999)).rejects.toThrow(/not found/);
    });

    it('should start version at 1 when no versions exist', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({
        id: 1,
        name: 'Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.createBotConfigurationVersion.mockResolvedValue(100);

      const version = await service.createBotConfigVersion(1, 'Initial', 'admin');

      expect(version.version).toBe('1');
    });

    it('should increment version number', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue({
        id: 1,
        name: 'Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([
        { id: 1, version: '1' },
        { id: 2, version: '2' },
        { id: 3, version: '3' },
      ]);
      mockDbManager.createBotConfigurationVersion.mockResolvedValue(101);

      const version = await service.createBotConfigVersion(1, 'v4', 'admin');

      expect(version.version).toBe('4');
    });
  });

  describe('getConfigStats', () => {
    it('should return stats object with correct shape', async () => {
      mockDbManager.getAllBotConfigurations.mockResolvedValue([
        { isActive: true, messageProvider: 'discord', llmProvider: 'openai' },
        { isActive: true, messageProvider: 'slack', llmProvider: 'openai' },
        { isActive: false, messageProvider: 'discord', llmProvider: 'flowise' },
      ]);

      const stats = await service.getConfigStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.byProvider.discord).toBe(2);
      expect(stats.byProvider.slack).toBe(1);
      expect(stats.byLlmProvider.openai).toBe(2);
      expect(stats.byLlmProvider.flowise).toBe(1);
    });

    it('should throw when database is down', async () => {
      mockDbManager.isConfigured.mockReturnValue(false);
      await expect(service.getConfigStats()).rejects.toThrow(ConfigurationError);
    });
  });

  describe('validateBotConfig', () => {
    it('should return validation result', async () => {
      const result = await service.validateBotConfig({
        name: 'Test',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      expect(result.isValid).toBe(true);
    });

    it('should catch validator errors gracefully', async () => {
      mockValidator.validateBotConfig.mockImplementation(() => {
        throw new Error('Validator crash');
      });

      const result = await service.validateBotConfig({});
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBe('Validator crash');
    });
  });
});
