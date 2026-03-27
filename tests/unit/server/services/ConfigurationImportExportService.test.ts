import fs from 'fs';
import { AuditLogger } from '../../../../src/common/auditLogger';
import { UserConfigStore } from '../../../../src/config/UserConfigStore';
import { DatabaseManager } from '../../../../src/database/DatabaseManager';
import { ConfigurationImportExportService } from '../../../../src/server/services/ConfigurationImportExportService';

jest.mock('../../../../src/database/DatabaseManager');
jest.mock('../../../../src/config/UserConfigStore');
jest.mock('../../../../src/common/auditLogger');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe('ConfigurationImportExportService - Backup Retention', () => {
  let service: any;
  let mockUserConfig: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup UserConfigStore mock
    mockUserConfig = {
      getGeneralSettings: jest.fn().mockReturnValue({
        backupRetentionLimit: 3,
        enableColdStorage: false,
      }),
    };
    (UserConfigStore.getInstance as jest.Mock).mockReturnValue(mockUserConfig);

    // Setup AuditLogger mock
    mockAuditLogger = {
      logAdminAction: jest.fn(),
    };
    (AuditLogger.getInstance as jest.Mock).mockReturnValue(mockAuditLogger);

    // Setup DB Manager mock
    (DatabaseManager.getInstance as jest.Mock).mockReturnValue({
      getAllBotConfigurations: jest.fn().mockResolvedValue([]),
    });

    // Initialize service
    service = ConfigurationImportExportService.getInstance();

    // Mock exportConfigurations which is called internally
    service.exportConfigurations = jest.fn().mockResolvedValue({
      success: true,
      filePath: '/tmp/test.json',
      size: 100,
      checksum: 'abc',
    });
  });

  test('happy path: should prune oldest backups when exceeding limit', async () => {
    // Mock existing backups
    service.listBackups = jest.fn().mockResolvedValue([
      { id: 'b4', name: 'backup-4', createdAt: new Date(4000) },
      { id: 'b3', name: 'backup-3', createdAt: new Date(3000) },
      { id: 'b2', name: 'backup-2', createdAt: new Date(2000) },
      { id: 'b1', name: 'backup-1', createdAt: new Date(1000) }, // Oldest
    ]);

    service.deleteBackup = jest.fn().mockResolvedValue(true);

    await service.createBackup('test');

    // It should delete the 1 oldest backup because limit is 3, and there are 4 + 1 new (but listBackups only returns 4 here for simplicity)
    // Wait, listBackups is called AFTER the new backup metadata is written.
    // Let's mock listBackups to return 4 items. The limit is 3. So it should slice(3) -> 1 item (the oldest)
    expect(service.deleteBackup).toHaveBeenCalledTimes(1);
    expect(service.deleteBackup).toHaveBeenCalledWith('b1');
    expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
      'system',
      'DELETE',
      'backup/b1',
      'success',
      'Deleted backup backup-1 due to retention limit'
    );
  });

  test('edge case: exactly at limit, should not prune', async () => {
    // Exactly at limit of 3
    service.listBackups = jest.fn().mockResolvedValue([
      { id: 'b3', name: 'backup-3', createdAt: new Date(3000) },
      { id: 'b2', name: 'backup-2', createdAt: new Date(2000) },
      { id: 'b1', name: 'backup-1', createdAt: new Date(1000) },
    ]);

    service.deleteBackup = jest.fn().mockResolvedValue(true);

    await service.createBackup('test');

    expect(service.deleteBackup).not.toHaveBeenCalled();
  });

  test('error case: should swallow errors during retention check and still return success', async () => {
    service.listBackups = jest.fn().mockRejectedValue(new Error('File system error'));

    const result = await service.createBackup('test');

    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
  });
});

describe('ConfigurationImportExportService - Version Caching', () => {
  let service: any;
  let dbManagerMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance to ensure clean state
    (ConfigurationImportExportService as any).instance = undefined;
    service = ConfigurationImportExportService.getInstance();

    // Setup DB Manager mock specifically for caching tests
    dbManagerMock = {
      getBotConfiguration: jest.fn().mockImplementation((id) => {
        if (id === 1 || id === 2) {
          return Promise.resolve({ id, name: `Config ${id}` });
        }
        return Promise.resolve(null);
      }),
      createBotConfigurationVersion: jest.fn().mockResolvedValue(1),
    };
    (service as any).dbManager = dbManagerMock;

    // Mock fs.promises.readFile to return standard format JSON
    (fs.promises.readFile as jest.Mock).mockImplementation((path: string) => {
      return Promise.resolve(JSON.stringify({
        configurations: [],
        versions: [
          { botConfigurationId: 1, version: '1.0' },
          { botConfigurationId: 1, version: '1.1' },
          { botConfigurationId: 1, version: '1.2' },
          { botConfigurationId: 2, version: '1.0' },
          { botConfigurationId: 2, version: '1.1' },
          { botConfigurationId: 3, version: '1.0' }, // Invalid ID
          { botConfigurationId: 3, version: '1.1' },
        ]
      }));
    });
  });

  test('should cache getBotConfiguration calls when processing versions to prevent N+1 query', async () => {
    const result = await service.importConfigurations('/fake/path.json', { format: 'json' });

    // Assert that the db manager was called exactly once per unique botConfigurationId
    expect(dbManagerMock.getBotConfiguration).toHaveBeenCalledTimes(3);
    expect(dbManagerMock.getBotConfiguration).toHaveBeenCalledWith(1);
    expect(dbManagerMock.getBotConfiguration).toHaveBeenCalledWith(2);
    expect(dbManagerMock.getBotConfiguration).toHaveBeenCalledWith(3);

    // Valid versions should be created (5 valid versions total)
    expect(dbManagerMock.createBotConfigurationVersion).toHaveBeenCalledTimes(5);
  });
});
