import path from 'path';
import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock ConfigurationTemplateService
jest.mock('../../src/server/services/ConfigurationTemplateService', () => ({
  ConfigurationTemplateService: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock ConfigurationVersionService
jest.mock('../../src/server/services/ConfigurationVersionService', () => ({
  ConfigurationVersionService: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

describe('ConfigurationImportExportService Path Security', () => {
  let service: ConfigurationImportExportService;

  beforeEach(() => {
    service = ConfigurationImportExportService.getInstance();
  });

  it('getBackupFilePath should return null and not throw for malicious backup names', async () => {
    const maliciousName = '../../etc/passwd';
    const createdAt = new Date(1600000000000);

    // Mock listBackups to return a malicious backup
    jest.spyOn(service, 'listBackups').mockResolvedValue([
      {
        id: 'malicious-id',
        name: maliciousName,
        createdAt: createdAt,
        createdBy: 'admin',
        configCount: 0,
        versionCount: 0,
        templateCount: 0,
        size: 0,
        checksum: '',
        encrypted: false,
        compressed: false
      }
    ]);

    const result = await service.getBackupFilePath('malicious-id');

    // Depending on implementation, it might throw or return null.
    // If it's caught in getBackupFilePath's try-catch, it returns null.
    expect(result).toBeNull();
  });

  it('getBackupFilePath should return a valid path for safe names', async () => {
    const safeName = 'my-backup';
    const createdAt = new Date(1600000000000);

    jest.spyOn(service, 'listBackups').mockResolvedValue([
      {
        id: 'safe-id',
        name: safeName,
        createdAt: createdAt,
        createdBy: 'admin',
        configCount: 0,
        versionCount: 0,
        templateCount: 0,
        size: 0,
        checksum: '',
        encrypted: false,
        compressed: false
      }
    ]);

    const result = await service.getBackupFilePath('safe-id');

    expect(result).not.toBeNull();
    expect(result).toContain('backup-my-backup-1600000000000.json.gz');
    expect(path.isAbsolute(result!)).toBe(true);
  });
});
