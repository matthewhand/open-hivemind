import { promises as fs } from 'fs';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/database/DatabaseManager', () => {
  const mockDb = {
    getBotConfigurationsBulk: jest.fn(),
    createBotConfiguration: jest.fn(),
    updateBotConfiguration: jest.fn(),
    getAllBotConfigurations: jest.fn(),
  };
  return {
    DatabaseManager: {
      getInstance: jest.fn(() => mockDb),
    },
  };
});

jest.mock('../../src/server/services/ConfigurationTemplateService', () => ({
  ConfigurationTemplateService: {
    getInstance: jest.fn(() => ({
      getAllTemplates: jest.fn().mockResolvedValue([]),
    })),
  },
}));

jest.mock('../../src/server/services/ConfigurationVersionService', () => ({
  ConfigurationVersionService: {
    getInstance: jest.fn(() => ({
      getBotConfigurationVersions: jest.fn().mockResolvedValue([]),
    })),
  },
}));

describe('ConfigurationImportExportService', () => {
  let service: ConfigurationImportExportService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (ConfigurationImportExportService as any).instance = undefined;
    service = ConfigurationImportExportService.getInstance();
    mockDb = DatabaseManager.getInstance();
  });

  const sampleConfig = {
    id: 1,
    name: 'Test Config',
    llmProvider: 'openai',
    messageProvider: 'discord',
  };

  describe('exportConfigurations', () => {
    it('should export selected configurations to JSON', async () => {
      mockDb.getBotConfigurationsBulk.mockResolvedValue([sampleConfig]);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.exportConfigurations([1], { format: 'json' });

      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();

      const savedContent = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedContent.configurations).toHaveLength(1);
      expect(savedContent.configurations[0].id).toBe(1);
    });

    it('should return error if no configurations found', async () => {
      mockDb.getBotConfigurationsBulk.mockResolvedValue([]);

      const result = await service.exportConfigurations([999], { format: 'json' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No configurations found');
    });
  });

  describe('importConfigurations', () => {
    it('should import new configurations', async () => {
      const importData = {
        configurations: [sampleConfig],
      };
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(JSON.stringify(importData)));
      mockDb.getBotConfigurationsBulk.mockResolvedValue([]); // No existing config
      mockDb.createBotConfiguration.mockResolvedValue(undefined);

      const result = await service.importConfigurations('test-import.json', {
        format: 'json',
      } as any);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(mockDb.createBotConfiguration).toHaveBeenCalled();
    });

    it('should update existing configurations if overwrite is true', async () => {
      const importData = {
        configurations: [sampleConfig],
      };
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(JSON.stringify(importData)));
      mockDb.getBotConfigurationsBulk.mockResolvedValue([sampleConfig]); // Existing config
      mockDb.updateBotConfiguration.mockResolvedValue(undefined);

      const result = await service.importConfigurations('test-import.json', {
        format: 'json',
        overwrite: true,
      } as any);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(mockDb.updateBotConfiguration).toHaveBeenCalled();
    });

    it('should skip existing configurations if overwrite is false', async () => {
      const importData = {
        configurations: [sampleConfig],
      };
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(JSON.stringify(importData)));
      mockDb.getBotConfigurationsBulk.mockResolvedValue([sampleConfig]); // Existing config

      const result = await service.importConfigurations('test-import.json', {
        format: 'json',
        overwrite: false,
      } as any);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(mockDb.createBotConfiguration).not.toHaveBeenCalled();
    });
  });
});
