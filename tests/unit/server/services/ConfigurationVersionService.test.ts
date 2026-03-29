import { ConfigurationVersionService } from '../../../../src/server/services/ConfigurationVersionService';
import { DatabaseManager } from '../../../../src/database/DatabaseManager';
import { ConfigurationValidator } from '../../../../src/server/services/ConfigurationValidator';

jest.mock('../../../../src/database/DatabaseManager');
jest.mock('../../../../src/server/services/ConfigurationValidator');

describe('ConfigurationVersionService', () => {
  let service: ConfigurationVersionService;
  let mockDbManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    (ConfigurationVersionService as any).instance = null;

    // Mock DatabaseManager
    mockDbManager = {
      getBotConfiguration: jest.fn(),
      getBotConfigurationVersions: jest.fn().mockResolvedValue([]),
      createBotConfigurationVersion: jest.fn().mockResolvedValue(1),
      deleteBotConfigurationVersion: jest.fn().mockResolvedValue(true),
      updateBotConfiguration: jest.fn().mockResolvedValue(undefined),
      createBotConfigurationAudit: jest.fn().mockResolvedValue(1),
      getBotConfigurationAudit: jest.fn().mockResolvedValue([]),
    } as any;

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);
    (ConfigurationValidator as jest.Mock).mockImplementation(() => ({}));

    service = ConfigurationVersionService.getInstance();
  });

  afterEach(() => {
    (ConfigurationVersionService as any).instance = null;
  });

  describe('initialization', () => {
    test('should return singleton instance', () => {
      const instance1 = ConfigurationVersionService.getInstance();
      const instance2 = ConfigurationVersionService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('createVersion', () => {
    test('should create new version from current config', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: '{"token": "test"}',
        openai: '{"apiKey": "test"}',
        isActive: true,
      };

      const mockVersions = [
        {
          id: 1,
          botConfigurationId: 1,
          version: '1.0.0',
          name: 'test-bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          createdAt: new Date(),
          createdBy: 'user-1',
        },
      ];

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.createVersion({
        botConfigurationId: 1,
        version: '1.0.0',
        changeLog: 'Initial version',
        createdBy: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(mockDbManager.createBotConfigurationVersion).toHaveBeenCalled();
    });

    test('should throw error for non-existent configuration', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      await expect(
        service.createVersion({
          botConfigurationId: 999,
          version: '1.0.0',
        })
      ).rejects.toThrow('not found');
    });

    test('should reject duplicate version', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const mockVersions = [
        { version: '1.0.0', botConfigurationId: 1 },
      ];

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      await expect(
        service.createVersion({
          botConfigurationId: 1,
          version: '1.0.0',
        })
      ).rejects.toThrow('already exists');
    });

    test('should include all config fields in version', async () => {
      const mockConfig = {
        id: 1,
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        persona: 'friendly',
        systemInstruction: 'Be helpful',
        mcpServers: '["server1"]',
        mcpGuard: '{"enabled": true}',
        discord: '{"token": "test"}',
        openai: '{"apiKey": "test"}',
        isActive: true,
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([
        { version: '1.0.0', botConfigurationId: 1 },
      ] as any);

      const result = await service.createVersion({
        botConfigurationId: 1,
        version: '1.0.1',
      });

      expect(result.persona).toBe('friendly');
      expect(result.systemInstruction).toBe('Be helpful');
    });
  });

  describe('getVersionHistory', () => {
    test('should return version history sorted by date', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          createdAt: new Date('2024-01-01'),
        },
        {
          version: '1.0.1',
          createdAt: new Date('2024-01-02'),
        },
        {
          version: '1.1.0',
          createdAt: new Date('2024-01-03'),
        },
      ];

      const mockConfig = { id: 1, name: 'test-bot' };

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);
      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);

      const result = await service.getVersionHistory(1);

      expect(result.versions).toHaveLength(3);
      expect(result.versions[0].version).toBe('1.1.0'); // Most recent first
      expect(result.total).toBe(3);
    });

    test('should handle empty version history', async () => {
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, name: 'test-bot' } as any);

      const result = await service.getVersionHistory(1);

      expect(result.versions).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getVersion', () => {
    test('should retrieve specific version', async () => {
      const mockVersions = [
        { version: '1.0.0', name: 'test-bot' },
        { version: '1.0.1', name: 'test-bot' },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.getVersion(1, '1.0.1');

      expect(result).toBeDefined();
      expect(result?.version).toBe('1.0.1');
    });

    test('should return null for non-existent version', async () => {
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);

      const result = await service.getVersion(1, '1.0.0');

      expect(result).toBeNull();
    });
  });

  describe('compareVersions', () => {
    test('should compare two versions', async () => {
      const mockVersions = [
        {
          id: 1,
          version: '1.0.0',
          name: 'test-bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          persona: 'friendly',
        },
        {
          id: 2,
          version: '1.0.1',
          name: 'test-bot-updated',
          messageProvider: 'discord',
          llmProvider: 'flowise',
          persona: 'professional',
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      expect(result).toBeDefined();
      expect(result.version1.version).toBe('1.0.0');
      expect(result.version2.version).toBe('1.0.1');
      expect(result.differences.length).toBeGreaterThan(0);
    });

    test('should detect added fields', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          name: 'test-bot',
          messageProvider: 'discord',
        },
        {
          version: '1.0.1',
          name: 'test-bot',
          messageProvider: 'discord',
          persona: 'friendly',
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      const addedFields = result.differences.filter((d) => d.changeType === 'added');
      expect(addedFields.length).toBeGreaterThan(0);
    });

    test('should detect removed fields', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          name: 'test-bot',
          messageProvider: 'discord',
          persona: 'friendly',
        },
        {
          version: '1.0.1',
          name: 'test-bot',
          messageProvider: 'discord',
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      const removedFields = result.differences.filter((d) => d.changeType === 'removed');
      expect(removedFields.length).toBeGreaterThan(0);
    });

    test('should detect modified fields', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          name: 'test-bot',
          llmProvider: 'openai',
        },
        {
          version: '1.0.1',
          name: 'test-bot',
          llmProvider: 'flowise',
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      const modifiedFields = result.differences.filter((d) => d.changeType === 'modified');
      expect(modifiedFields.length).toBeGreaterThan(0);
    });

    test('should generate difference summary', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          name: 'test-bot',
          messageProvider: 'discord',
          oldField: 'old',
        },
        {
          version: '1.0.1',
          name: 'updated-bot',
          messageProvider: 'discord',
          newField: 'new',
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      expect(result.summary).toBeDefined();
      expect(result.summary.added).toBeGreaterThanOrEqual(0);
      expect(result.summary.modified).toBeGreaterThanOrEqual(0);
      expect(result.summary.removed).toBeGreaterThanOrEqual(0);
    });

    test('should throw error for non-existent version', async () => {
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([
        { version: '1.0.0' },
      ] as any);

      await expect(service.compareVersions(1, '1.0.0', '1.0.1')).rejects.toThrow('not found');
    });
  });

  describe('restoreVersion', () => {
    test('should restore configuration to specific version', async () => {
      const mockVersion = {
        version: '1.0.0',
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
      };

      const mockRestoredConfig = {
        id: 1,
        ...mockVersion,
      };

      mockDbManager.getBotConfigurationVersions.mockResolvedValue([mockVersion] as any);
      mockDbManager.getBotConfiguration.mockResolvedValue(mockRestoredConfig as any);

      const result = await service.restoreVersion(1, '1.0.0', 'user-1');

      expect(result).toBeDefined();
      expect(mockDbManager.updateBotConfiguration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'test-bot',
          messageProvider: 'discord',
        })
      );
      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE' })
      );
    });

    test('should throw error for non-existent version', async () => {
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([]);

      await expect(service.restoreVersion(1, '1.0.0')).rejects.toThrow('not found');
    });

    test('should create audit log on restore', async () => {
      const mockVersion = {
        version: '1.0.0',
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockDbManager.getBotConfigurationVersions.mockResolvedValue([mockVersion] as any);
      mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...mockVersion } as any);

      await service.restoreVersion(1, '1.0.0', 'user-1');

      expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          performedBy: 'user-1',
          oldValues: expect.stringContaining('1.0.0'),
        })
      );
    });
  });

  describe('deleteVersion', () => {
    test('should delete non-active version', async () => {
      const mockVersions = [
        { version: '1.0.0' },
        { version: '1.0.1' },
      ];

      const mockConfig = {
        id: 1,
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);
      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);

      const result = await service.deleteVersion(1, '1.0.0');

      expect(result).toBe(true);
      expect(mockDbManager.deleteBotConfigurationVersion).toHaveBeenCalledWith(1, '1.0.0');
    });

    test('should prevent deleting the only version', async () => {
      mockDbManager.getBotConfigurationVersions.mockResolvedValue([{ version: '1.0.0' }] as any);

      await expect(service.deleteVersion(1, '1.0.0')).rejects.toThrow('only version');
    });

    test('should prevent deleting currently active version', async () => {
      const mockVersions = [
        { version: '1.0.0', messageProvider: 'discord', llmProvider: 'openai', persona: 'test' },
        { version: '1.0.1', messageProvider: 'slack', llmProvider: 'flowise', persona: 'other' },
      ];

      const mockConfig = {
        id: 1,
        messageProvider: 'discord',
        llmProvider: 'openai',
        persona: 'test',
      };

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);
      mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig as any);

      await expect(service.deleteVersion(1, '1.0.0')).rejects.toThrow('currently active');
    });
  });

  describe('getAuditLog', () => {
    test('should retrieve audit log', async () => {
      const mockAuditLog = [
        {
          id: 1,
          action: 'CREATE',
          performedBy: 'user-1',
          performedAt: new Date(),
        },
        {
          id: 2,
          action: 'UPDATE',
          performedBy: 'user-2',
          performedAt: new Date(),
        },
      ];

      mockDbManager.getBotConfigurationAudit.mockResolvedValue(mockAuditLog as any);

      const result = await service.getAuditLog(1);

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('CREATE');
    });

    test('should limit audit log results', async () => {
      const mockAuditLog = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        action: 'UPDATE',
        performedAt: new Date(),
      }));

      mockDbManager.getBotConfigurationAudit.mockResolvedValue(mockAuditLog as any);

      const result = await service.getAuditLog(1, 10);

      expect(result).toHaveLength(10);
    });

    test('should handle empty audit log', async () => {
      mockDbManager.getBotConfigurationAudit.mockResolvedValue([]);

      const result = await service.getAuditLog(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle nested object comparisons', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          discord: { token: 'old-token', channelId: 'channel-1' },
        },
        {
          version: '1.0.1',
          discord: { token: 'new-token', channelId: 'channel-1' },
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      expect(result.differences.length).toBeGreaterThan(0);
    });

    test('should handle null values in comparison', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          persona: null,
        },
        {
          version: '1.0.1',
          persona: 'friendly',
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      expect(result.differences.some((d) => d.field === 'persona')).toBe(true);
    });

    test('should handle undefined values in comparison', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          systemInstruction: undefined,
        },
        {
          version: '1.0.1',
          systemInstruction: 'Be helpful',
        },
      ];

      mockDbManager.getBotConfigurationVersions.mockResolvedValue(mockVersions as any);

      const result = await service.compareVersions(1, '1.0.0', '1.0.1');

      expect(result.differences.some((d) => d.field === 'systemInstruction')).toBe(true);
    });
  });
});
